import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { OAuth2Client } from 'google-auth-library'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

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

  const { title, sections } = await generateSummary(emails, dateStr)
  const summaryText = sections.map(s => s.content).join('\n\n')
  logger.info('Summary generated', { title, length: summaryText.length, sectionCount: sections.length })

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

  await generateEmbeddings(episode!.id, sections, supabase)

  // Use direct REST API for raw_emails insert (Supabase JS client silently fails on this table)
  const rawEmailRows = emails.map(e => ({
    episode_id: episode!.id,
    sender: e.sender,
    subject: e.subject,
    received_at: normalizeDate(e.receivedAt),
    gmail_message_id: e.messageId,
  }))
  const insertRes = await fetch(
    `${process.env.VITE_SUPABASE_URL}/rest/v1/raw_emails`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(rawEmailRows),
    }
  )
  if (!insertRes.ok) {
    const errBody = await insertRes.text()
    logger.error('raw_emails insert failed', { status: insertRes.status, body: errBody })
    throw new Error(`raw_emails insert failed: ${insertRes.status} ${errBody}`)
  }
  const inserted = await insertRes.json() as any[]
  logger.info('raw_emails inserted', { count: inserted.length })

  logger.info('Digest complete', { date: dateStr })
}

// ── helpers ────────────────────────────────────────────────────────────────

interface EmailItem {
  sender: string
  subject: string
  body: string
  receivedAt: string
  messageId: string
}

interface DigestSection {
  content: string
  source_idx: number   // -1 for intro/outro
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

    emails.push({ sender: from, subject, body, receivedAt: date, messageId: msg.id })
  }
  return emails
}

function normalizeDate(rfc2822: string): string {
  const d = new Date(rfc2822)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
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
): Promise<{ title: string; sections: DigestSection[] }> {
  const anthropic = getAnthropic()
  const emailsText = emails
    .map((e, i) => `=== [邮件 ${i}] ${e.subject} (来自 ${e.sender}) ===\n${e.body.slice(0, 3000)}`)
    .join('\n\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    tools: [{
      name: 'save_digest',
      description: '保存带来源标记的播客摘要',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: '简短的今日标题，如：5月6日科技早报' },
          summary: {
            type: 'string',
            description: '播客文字稿。每段开头单起一行写 [SOURCE:N] 来源标记。N 是邮件编号（0-based）；开场白/结语/通用过渡用 -1。'
          },
        },
        required: ['title', 'summary'],
      },
    }],
    tool_choice: { type: 'tool', name: 'save_digest' },
    messages: [{
      role: 'user',
      content: `你是一位专业的内容编辑。以下是 ${dateStr} 收到的订阅邮件，每封有编号 [邮件 N]。

任务：
1. 去重整合内容，生成播客文字稿（约 1500-2000 字）
2. 语气像知识博主娓娓道来，自然流畅
3. **每段开头单独一行加上来源标记 [SOURCE:N]**：
   - N 是该段主要来自的邮件编号（0-based）
   - 开场白、结语、跨多封邮件的过渡段用 [SOURCE:-1]
4. 同一封邮件的内容尽量放一段或相邻段
5. 正文里不要出现 "邮件 X" 之类的元信息

输出格式示例：
[SOURCE:-1]
大家好，今天是 5 月 X 日……

[SOURCE:0]
第一条来自……

[SOURCE:0]
继续聊这件事……

[SOURCE:2]
另一项研究表明……

[SOURCE:-1]
今天就到这里……

邮件内容：
${emailsText}`,
    }],
  })

  const toolUse = msg.content.find(c => c.type === 'tool_use') as any
  if (!toolUse) {
    throw new Error(`No tool_use. stop_reason=${msg.stop_reason}. content=${JSON.stringify(msg.content).slice(0, 800)}`)
  }
  const { title, summary } = toolUse.input as { title: string; summary: string }
  if (!summary || typeof summary !== 'string') {
    throw new Error(`Bad summary. stop_reason=${msg.stop_reason}. input=${JSON.stringify(toolUse.input).slice(0, 800)}`)
  }

  const sections = parseSourceMarkers(summary)
  if (sections.length === 0) {
    throw new Error(`No sections parsed. summary head: ${summary.slice(0, 300)}`)
  }
  logger.info('Sections parsed', { count: sections.length, sources: sections.map(s => s.source_idx) })
  return { title, sections }
}

function parseSourceMarkers(summary: string): DigestSection[] {
  const re = /\[SOURCE:(-?\d+)\]\s*\n?/g
  const matches: Array<{ end: number; nextStart: number; src: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(summary)) !== null) {
    matches.push({ end: re.lastIndex, nextStart: m.index, src: parseInt(m[1], 10) })
  }
  if (matches.length === 0) {
    // Fallback — no markers found, treat whole thing as one section
    return [{ content: summary.trim(), source_idx: -1 }]
  }
  const sections: DigestSection[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].end
    const end = i + 1 < matches.length ? matches[i + 1].nextStart : summary.length
    const content = summary.slice(start, end).trim()
    if (content) sections.push({ content, source_idx: matches[i].src })
  }
  return sections
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

async function generateEmbeddings(
  episodeId: string,
  sections: DigestSection[],
  supabase: ReturnType<typeof getSupabase>
): Promise<void> {
  const openai = getOpenAI()
  const contents = sections.map(s => s.content)

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: contents,
  })

  await supabase.from('episode_chunks').insert(
    sections.map((sec, i) => ({
      episode_id: episodeId,
      chunk_index: i,
      content: sec.content,
      embedding: embeddingResponse.data[i].embedding,
      source_email_idx: sec.source_idx >= 0 ? sec.source_idx : null,
    }))
  )
}
