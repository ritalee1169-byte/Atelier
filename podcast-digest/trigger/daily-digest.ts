import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { OAuth2Client } from 'google-auth-library'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { chunkText } from '../src/lib/chunker'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const getSupabase = () => createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch }, realtime: { transport: ws as any } }
)

// Scheduled: every day at 22:00 UTC (06:00 Beijing next day)
// At 22:00 UTC the UTC date is "today" = yesterday in Beijing — that's what we want to digest.
export const dailyDigest = schedules.task({
  id: 'daily-digest',
  cron: '0 22 * * *',
  maxDuration: 300,
  run: async () => {
    await runDigest(new Date())
  },
})

// Manual backfill: trigger with { date: "YYYY-MM-DD" }
export const backfillDigest = task({
  id: 'backfill-digest',
  maxDuration: 300,
  run: async (payload: { date?: string }) => {
    if (!payload.date) throw new Error('payload.date is required, e.g. { "date": "2026-05-06" }')
    const date = new Date(payload.date + 'T12:00:00Z')
    if (isNaN(date.getTime())) throw new Error(`Invalid date: ${payload.date}`)
    await runDigest(date)
  },
})

// ── shared pipeline ────────────────────────────────────────────────────────

async function runDigest(date: Date) {
  const supabase = getSupabase()
  const dateStr = date.toISOString().split('T')[0]

  logger.info('Starting digest for', { date: dateStr })

  const { data: existing } = await supabase
    .from('episodes')
    .select('id')
    .eq('date', dateStr)
    .maybeSingle()
  if (existing) {
    logger.info('Episode already exists, skipping', { date: dateStr })
    return
  }

  const emails = await fetchGmailEmails(date)
  logger.info('Fetched emails', { count: emails.length })
  if (emails.length === 0) {
    logger.info('No emails found, skipping')
    return
  }

  const { title, summaryText } = await generateSummary(emails, dateStr)
  logger.info('Summary generated', { title, length: summaryText.length })

  // Insert episode first so audio upload can't leave a stale file if insert fails
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .insert({
      date: dateStr,
      title,
      summary_text: summaryText,
      audio_url: '',
      source_count: emails.length,
    })
    .select('id')
    .single()

  if (episodeError) throw new Error(`Episode insert failed: ${JSON.stringify(episodeError)}`)

  const audioUrl = await generateAudio(summaryText, dateStr, supabase)
  logger.info('Audio uploaded', { audioUrl })

  await supabase.from('episodes').update({ audio_url: audioUrl }).eq('id', episode!.id)

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
}

// ── helpers ────────────────────────────────────────────────────────────────

interface EmailItem {
  sender: string
  subject: string
  body: string
  receivedAt: string
}

async function getGmailToken(): Promise<string> {
  const auth = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('Failed to get Gmail access token')
  return token
}

async function fetchGmailEmails(date: Date): Promise<EmailItem[]> {
  const token = await getGmailToken()

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const after = Math.floor(start.getTime() / 1000)
  const before = Math.floor(end.getTime() / 1000)

  const q = `-in:sent -category:social -category:promotions after:${after} before:${before}`
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const listData = await listRes.json() as { messages?: { id: string }[] }
  if (!listData.messages) return []

  const emails: EmailItem[] = []
  for (const msg of listData.messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const full = await msgRes.json() as any

    const headers: { name: string; value: string }[] = full.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''
    const date = headers.find(h => h.name === 'Date')?.value ?? ''

    const body = extractBody(full.payload)
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
    tools: [{
      name: 'save_digest',
      description: '保存播客摘要',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: '简短的今日标题，如：5月6日科技早报' },
          summary: { type: 'string', description: '适合朗读的播客文字稿，约1500-2000字' },
        },
        required: ['title', 'summary'],
      },
    }],
    tool_choice: { type: 'tool', name: 'save_digest' },
    messages: [{
      role: 'user',
      content: `你是一位专业的内容编辑。以下是${dateStr}收到的订阅邮件内容。

请完成以下任务：
1. 去除重复话题，整合相关内容
2. 生成一篇适合朗读的播客文字稿，约1500-2000字
3. 语气自然流畅，像一位知识博主在娓娓道来
4. 段落之间用空行分隔（便于分段）

邮件内容：
${emailsText}`,
    }],
  })

  const toolUse = msg.content.find(c => c.type === 'tool_use') as any
  if (!toolUse) throw new Error('Claude did not return tool_use block')
  const { title, summary } = toolUse.input as { title: string; summary: string }
  return { title, summaryText: summary }
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
    chunks.map((content: string, i: number) => ({
      episode_id: episodeId,
      chunk_index: i,
      content,
      embedding: embeddingResponse.data[i].embedding,
    }))
  )
}
