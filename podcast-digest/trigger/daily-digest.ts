import { schedules, logger } from '@trigger.dev/sdk/v3'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { chunkText } from '../src/lib/chunker'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const getSupabase = () => createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dailyDigest = schedules.task({
  id: 'daily-digest',
  // 22:00 UTC = 06:00 Beijing time
  cron: '0 22 * * *',
  maxDuration: 300,
  run: async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    logger.info('Starting digest for', { date: dateStr })

    const supabase = getSupabase()

    const emails = await fetchGmailEmails(yesterday)
    logger.info('Fetched emails', { count: emails.length })
    if (emails.length === 0) {
      logger.info('No emails found, skipping')
      return
    }

    const { title, summaryText } = await generateSummary(emails, dateStr)
    logger.info('Summary generated', { title, length: summaryText.length })

    const audioUrl = await generateAudio(summaryText, dateStr, supabase)
    logger.info('Audio uploaded', { audioUrl })

    const { data: episode } = await supabase
      .from('episodes')
      .insert({
        date: dateStr,
        title,
        summary_text: summaryText,
        audio_url: audioUrl,
        source_count: emails.length,
      })
      .select('id')
      .single()

    logger.info('Episode saved', { episodeId: episode!.id })

    await generateEmbeddings(episode!.id, summaryText, supabase)

    await supabase.from('raw_emails').insert(
      emails.map(e => ({
        episode_id: episode!.id,
        sender: e.sender,
        subject: e.subject,
        received_at: e.receivedAt,
      }))
    )

    logger.info('Digest complete', { date: dateStr })
  },
})

// ── helpers ────────────────────────────────────────────────────────────────

interface EmailItem {
  sender: string
  subject: string
  body: string
  receivedAt: string
}

async function fetchGmailEmails(date: Date): Promise<EmailItem[]> {
  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  )
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })

  const gmail = google.gmail({ version: 'v1', auth: oauth2 })

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const after = Math.floor(start.getTime() / 1000)
  const before = Math.floor(end.getTime() / 1000)

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `-in:sent -category:social -category:promotions after:${after} before:${before}`,
    maxResults: 50,
  })

  if (!list.data.messages) return []

  const emails: EmailItem[] = []
  for (const msg of list.data.messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    })

    const headers = full.data.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''
    const date = headers.find(h => h.name === 'Date')?.value ?? ''

    const body = extractBody(full.data.payload)
    if (body.trim().length < 50) continue

    emails.push({ sender: from, subject, body, receivedAt: date })
  }
  return emails
}

function extractBody(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  for (const part of payload.parts ?? []) {
    const text = extractBody(part)
    if (text) return text
  }
  return ''
}

async function generateSummary(
  emails: EmailItem[],
  dateStr: string
): Promise<{ title: string; summaryText: string }> {
  const anthropic = getAnthropic()
  const emailsText = emails
    .map(e => `=== ${e.subject} (from: ${e.sender}) ===\n${e.body.slice(0, 3000)}`)
    .join('\n\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `你是一位专业的内容编辑。以下是${dateStr}收到的订阅邮件内容。

请完成以下任务：
1. 去除重复话题，整合相关内容
2. 生成一篇适合朗读的播客文字稿，约1500-2000字
3. 语气自然流畅，像一位知识博主在娓娓道来
4. 段落之间用空行分隔（便于分段）

请以以下JSON格式返回：
{"title": "简短的今日标题（如：5月6日科技早报）", "summary": "完整文字稿内容"}

邮件内容：
${emailsText}`,
    }],
  })

  const text = (msg.content[0] as any).text
  const parsed = JSON.parse(text)
  return { title: parsed.title, summaryText: parsed.summary }
}

async function generateAudio(text: string, dateStr: string, supabase: ReturnType<typeof getSupabase>): Promise<string> {
  const openai = getOpenAI()
  const response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'alloy',
    input: text,
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  const filename = `${dateStr}.mp3`

  const { error } = await supabase.storage
    .from('podcasts')
    .upload(filename, buffer, { contentType: 'audio/mpeg', upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('podcasts').getPublicUrl(filename)

  return data.publicUrl
}

async function generateEmbeddings(episodeId: string, text: string, supabase: ReturnType<typeof getSupabase>): Promise<void> {
  const openai = getOpenAI()
  const chunks = chunkText(text, 200)

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  })

  await supabase.from('episode_chunks').insert(
    chunks.map((content, i) => ({
      episode_id: episodeId,
      chunk_index: i,
      content,
      embedding: embeddingResponse.data[i].embedding,
    }))
  )
}
