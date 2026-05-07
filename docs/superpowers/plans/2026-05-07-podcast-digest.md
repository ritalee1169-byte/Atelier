# Podcast Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone web app that daily ingests Gmail subscriptions, generates a podcast episode via AI summarization + TTS, and serves it with a synchronized transcript reader, RSS feed, and Q&A notebook.

**Architecture:** New Vite+React+TypeScript project deployed to Vercel. Supabase provides PostgreSQL (with pgvector for semantic search) and file storage. Trigger.dev runs the daily pipeline job. Claude API handles summarization and Q&A; OpenAI handles TTS and embeddings.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, React Router v7, Supabase JS v2, Trigger.dev v3, Anthropic SDK, OpenAI SDK, Vitest

---

## File Map

```
podcast-digest/                         ← new standalone project (create alongside existing repo)
├── src/
│   ├── main.tsx                        entry point
│   ├── App.tsx                         router provider
│   ├── router.tsx                      route definitions
│   ├── types/
│   │   └── index.ts                    Episode, Note, Chunk, RawEmail types
│   ├── lib/
│   │   ├── supabase.ts                 Supabase browser client
│   │   ├── utils.ts                    cn(), formatDuration(), formatDate()
│   │   └── chunker.ts                  chunkText() — splits transcript for embeddings
│   ├── components/
│   │   ├── Layout.tsx                  nav header + AudioPlayer dock + <Outlet>
│   │   ├── AudioPlayer.tsx             bottom-dock player (uses useAudioPlayer)
│   │   ├── TranscriptView.tsx          text with chunk-level highlight sync
│   │   └── NoteCard.tsx                question/answer card with source badge
│   ├── hooks/
│   │   └── useAudioPlayer.ts           global audio state (currentEpisode, position, speed)
│   └── pages/
│       ├── Today.tsx                   / — latest episode
│       ├── Archive.tsx                 /archive
│       ├── EpisodeDetail.tsx           /episode/:id
│       ├── Notes.tsx                   /notes
│       └── Ask.tsx                     /ask
├── api/
│   ├── rss.ts                          GET /api/rss → RSS 2.0 XML
│   └── ask.ts                          POST /api/ask → embedding search + Claude answer + save note
├── trigger/
│   └── daily-digest.ts                 Trigger.dev job (5 steps)
├── supabase/
│   └── migrations/
│       ├── 001_create_tables.sql       episodes, raw_emails, notes
│       └── 002_pgvector.sql            episode_chunks with vector(1536)
├── src/test/
│   ├── utils.test.ts                   formatDuration, formatDate
│   ├── chunker.test.ts                 chunkText()
│   └── rss.test.ts                     generateRssXml()
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

---

## Phase 1 — Project Scaffold

### Task 1: Bootstrap project

**Files:**
- Create: `podcast-digest/package.json`
- Create: `podcast-digest/vite.config.ts`
- Create: `podcast-digest/tsconfig.json`
- Create: `podcast-digest/.env.example`
- Create: `podcast-digest/vercel.json`

- [ ] **Step 1: Create project directory and run scaffold**

```bash
cd ..   # go up from the existing repo
npm create vite@latest podcast-digest -- --template react-ts
cd podcast-digest
```

- [ ] **Step 2: Install dependencies**

```bash
npm install \
  react-router@7 \
  @supabase/supabase-js \
  @anthropic-ai/sdk \
  openai \
  @trigger.dev/sdk@3 \
  lucide-react \
  clsx \
  tailwind-merge

npm install -D \
  tailwindcss@4 \
  @tailwindcss/vite \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/user-event \
  jsdom
```

- [ ] **Step 3: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create `.env.example`**

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
TRIGGER_SECRET_KEY=
```

- [ ] **Step 6: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "functions": {
    "api/*.ts": { "maxDuration": 30 }
  }
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server at `http://localhost:5173`

- [ ] **Step 8: Commit**

```bash
git init && git add -A
git commit -m "chore: scaffold podcast-digest project"
```

---

### Task 2: Design tokens + global styles

**Files:**
- Create: `src/styles/globals.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/styles/globals.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
@import 'tailwindcss';

:root {
  --bg: #f7f7f5;
  --card: #ffffff;
  --foreground: #37352f;
  --muted: #9b9a97;
  --border: rgba(55, 53, 47, 0.09);
  --accent: #2383e2;
  --radius: 6px;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }
```

- [ ] **Step 2: Update `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: add design tokens and global styles"
```

---

### Task 3: Shared types and utility functions

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/chunker.ts`
- Create: `src/test/utils.test.ts`
- Create: `src/test/chunker.test.ts`

- [ ] **Step 1: Write failing tests for utils**

```typescript
// src/test/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatDuration, formatDate, cn } from '../lib/utils'

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })
  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })
})

describe('formatDate', () => {
  it('formats a date string to Chinese locale', () => {
    expect(formatDate('2026-05-07')).toBe('5月7日')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/test/utils.test.ts
```
Expected: FAIL — `Cannot find module '../lib/utils'`

- [ ] **Step 3: Create `src/types/index.ts`**

```typescript
export interface Episode {
  id: string
  date: string           // 'YYYY-MM-DD'
  title: string
  summary_text: string
  audio_url: string
  duration_sec: number
  source_count: number
  created_at: string
}

export interface EpisodeChunk {
  id: string
  episode_id: string
  chunk_index: number
  content: string
}

export interface Note {
  id: string
  question: string
  answer: string
  source_chunks: string[]
  episode_ids: string[]
  tags: string[]
  created_at: string
}
```

- [ ] **Step 4: Create `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}月${parseInt(d)}日`
}
```

- [ ] **Step 5: Run utils tests — confirm they pass**

```bash
npm test -- --run src/test/utils.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 6: Write failing tests for chunker**

```typescript
// src/test/chunker.test.ts
import { describe, it, expect } from 'vitest'
import { chunkText } from '../lib/chunker'

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const text = 'Hello world.'
    expect(chunkText(text, 100)).toEqual(['Hello world.'])
  })

  it('splits on paragraph boundaries', () => {
    const text = 'Para one.\n\nPara two.\n\nPara three.'
    const chunks = chunkText(text, 5)  // 5 words per chunk
    expect(chunks.length).toBeGreaterThan(1)
    // each chunk content is non-empty
    chunks.forEach(c => expect(c.trim().length).toBeGreaterThan(0))
  })

  it('does not produce empty chunks', () => {
    const text = 'A.\n\n\n\nB.'
    const chunks = chunkText(text, 100)
    expect(chunks.every(c => c.trim().length > 0)).toBe(true)
  })
})
```

- [ ] **Step 7: Run chunker tests — confirm they fail**

```bash
npm test -- --run src/test/chunker.test.ts
```
Expected: FAIL — `Cannot find module '../lib/chunker'`

- [ ] **Step 8: Create `src/lib/chunker.ts`**

```typescript
// Splits text into chunks by paragraph, targeting maxWords per chunk.
// Used to create episode_chunks for pgvector storage.
export function chunkText(text: string, maxWords: number): string[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  const chunks: string[] = []
  let current = ''
  let wordCount = 0

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length
    if (wordCount + words > maxWords && current) {
      chunks.push(current.trim())
      current = para
      wordCount = words
    } else {
      current = current ? `${current}\n\n${para}` : para
      wordCount += words
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}
```

- [ ] **Step 9: Run chunker tests — confirm they pass**

```bash
npm test -- --run src/test/chunker.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add shared types, utils, and chunker"
```

---

## Phase 2 — Database

### Task 4: Supabase setup and migrations

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`
- Create: `supabase/migrations/002_pgvector.sql`
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create Supabase project**

1. Go to https://supabase.com → New project
2. Copy the project URL and anon key into `.env.local`:
```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 2: Create `supabase/migrations/001_create_tables.sql`**

```sql
CREATE TABLE episodes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date UNIQUE NOT NULL,
  title        text NOT NULL,
  summary_text text NOT NULL,
  audio_url    text NOT NULL,
  duration_sec integer,
  source_count integer,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE raw_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id  uuid REFERENCES episodes(id) ON DELETE CASCADE,
  sender      text,
  subject     text,
  received_at timestamptz
);

CREATE TABLE notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question      text NOT NULL,
  answer        text NOT NULL,
  source_chunks uuid[],
  episode_ids   uuid[],
  tags          text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

-- Public read-only access for the frontend (row-level security off for single-user)
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "public read notes" ON notes FOR SELECT USING (true);
CREATE POLICY "public insert notes" ON notes FOR INSERT WITH CHECK (true);
```

- [ ] **Step 3: Create `supabase/migrations/002_pgvector.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE episode_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id   uuid REFERENCES episodes(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536)
);

CREATE INDEX ON episode_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE episode_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read chunks" ON episode_chunks FOR SELECT USING (true);
```

- [ ] **Step 4: Run migrations in Supabase SQL editor**

In Supabase Dashboard → SQL Editor, run `001_create_tables.sql` then `002_pgvector.sql`.

Verify in Table Editor that `episodes`, `raw_emails`, `notes`, `episode_chunks` tables exist.

- [ ] **Step 5: Create Supabase Storage bucket**

In Supabase Dashboard → Storage → New bucket:
- Name: `podcasts`
- Public: ✓ (files are public URLs)

- [ ] **Step 6: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add supabase migrations and client"
```

---

## Phase 3 — Backend Pipeline

### Task 5: Gmail OAuth token (one-time setup)

**Files:**
- Create: `scripts/get-gmail-token.ts`

This task runs once to obtain a long-lived refresh token. The token is stored as an env var; no user login flow is needed in the app itself.

- [ ] **Step 1: Enable Gmail API**

1. Go to https://console.cloud.google.com → APIs & Services → Enable APIs
2. Search "Gmail API" → Enable
3. Create OAuth 2.0 credentials (type: Desktop App)
4. Download client secret JSON → copy `client_id` and `client_secret` to `.env.local`

- [ ] **Step 2: Create `scripts/get-gmail-token.ts`**

```typescript
import { google } from 'googleapis'
import * as readline from 'readline'

// Run once with: npx tsx scripts/get-gmail-token.ts
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
)

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
})

console.log('Open this URL in your browser:', url)

const rl = readline.createInterface({ input: process.stdin })
rl.question('Paste the code here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code)
  console.log('GMAIL_REFRESH_TOKEN=', tokens.refresh_token)
  rl.close()
})
```

- [ ] **Step 3: Install googleapis and run the script**

```bash
npm install googleapis
npm install -D tsx
npx tsx scripts/get-gmail-token.ts
```

Follow the prompts. Copy the printed `GMAIL_REFRESH_TOKEN` value into `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add scripts/get-gmail-token.ts && git commit -m "chore: add gmail oauth token script"
```

---

### Task 6: Trigger.dev setup and job scaffold

**Files:**
- Create: `trigger/daily-digest.ts`
- Modify: `package.json` (add trigger dev script)

- [ ] **Step 1: Create Trigger.dev project**

1. Go to https://trigger.dev → New project
2. Copy `TRIGGER_SECRET_KEY` to `.env.local`

- [ ] **Step 2: Initialize Trigger.dev**

```bash
npx trigger.dev@3 init
```

Select: TypeScript, existing project. This creates `trigger.config.ts`.

- [ ] **Step 3: Create `trigger/daily-digest.ts`**

```typescript
import { schedules, logger } from '@trigger.dev/sdk/v3'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { chunkText } from '../src/lib/chunker'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
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

    // Step 1: Fetch emails
    const emails = await fetchGmailEmails(yesterday)
    logger.info('Fetched emails', { count: emails.length })
    if (emails.length === 0) {
      logger.info('No emails found, skipping')
      return
    }

    // Step 2: Generate summary
    const { title, summaryText } = await generateSummary(emails, dateStr)
    logger.info('Summary generated', { title, length: summaryText.length })

    // Step 3: Generate audio
    const audioUrl = await generateAudio(summaryText, dateStr)
    logger.info('Audio uploaded', { audioUrl })

    // Step 4: Save episode
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

    // Step 5: Generate and store embeddings
    await generateEmbeddings(episode!.id, summaryText)

    // Step 6: Save raw email records
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
    if (body.trim().length < 50) continue  // skip near-empty emails

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

async function generateAudio(text: string, dateStr: string): Promise<string> {
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

async function generateEmbeddings(episodeId: string, text: string): Promise<void> {
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
```

- [ ] **Step 4: Deploy job to Trigger.dev**

```bash
npx trigger.dev@3 deploy
```
Expected: "Successfully deployed daily-digest"

- [ ] **Step 5: Trigger a test run in Trigger.dev dashboard**

In Trigger.dev → Test → `daily-digest` → Run test (uses today's date minus 1).
Watch logs in real time to confirm each step completes without error.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add daily-digest trigger.dev job"
```

---

## Phase 4 — API Routes

### Task 7: RSS feed API route

**Files:**
- Create: `api/rss.ts`
- Create: `src/test/rss.test.ts`

- [ ] **Step 1: Write failing test for RSS generator**

```typescript
// src/test/rss.test.ts
import { describe, it, expect } from 'vitest'
import { generateRssXml } from '../lib/rss'
import type { Episode } from '../types'

const mockEpisodes: Episode[] = [
  {
    id: 'abc123',
    date: '2026-05-06',
    title: '5月6日科技早报',
    summary_text: '今天有很多有趣的新闻...',
    audio_url: 'https://example.com/podcasts/2026-05-06.mp3',
    duration_sec: 720,
    source_count: 5,
    created_at: '2026-05-06T22:01:00Z',
  },
]

describe('generateRssXml', () => {
  it('returns valid RSS 2.0 XML string', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
  })

  it('includes enclosure with audio URL', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('https://example.com/podcasts/2026-05-06.mp3')
    expect(xml).toContain('audio/mpeg')
  })

  it('includes episode title', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('5月6日科技早报')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --run src/test/rss.test.ts
```
Expected: FAIL — `Cannot find module '../lib/rss'`

- [ ] **Step 3: Create `src/lib/rss.ts`**

```typescript
import type { Episode } from '../types'

export function generateRssXml(episodes: Episode[]): string {
  const items = episodes.map(ep => `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.summary_text.slice(0, 300)}...]]></description>
      <pubDate>${new Date(ep.created_at).toUTCString()}</pubDate>
      <guid isPermaLink="false">${ep.id}</guid>
      <enclosure
        url="${ep.audio_url}"
        type="audio/mpeg"
        length="0"
      />
      ${ep.duration_sec ? `<itunes:duration>${ep.duration_sec}</itunes:duration>` : ''}
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>每日知识播客</title>
    <link>${process.env.VITE_APP_URL ?? 'https://localhost:5173'}</link>
    <description>每天自动整合邮件订阅内容，生成播客</description>
    <language>zh-cn</language>
    ${items}
  </channel>
</rss>`
}
```

- [ ] **Step 4: Run RSS tests — confirm they pass**

```bash
npm test -- --run src/test/rss.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Create `api/rss.ts` (Vercel serverless function)**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { generateRssXml } from '../src/lib/rss'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('*')
    .order('date', { ascending: false })
    .limit(20)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const xml = generateRssXml(episodes ?? [])
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600')
  res.status(200).send(xml)
}
```

- [ ] **Step 6: Install vercel types**

```bash
npm install -D @vercel/node
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add RSS feed API route"
```

---

### Task 8: Q&A API route

**Files:**
- Create: `api/ask.ts`

- [ ] **Step 1: Create `api/ask.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { question, saveNote = true } = req.body as {
    question: string
    saveNote?: boolean
  }

  if (!question?.trim()) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // 1. Embed the question
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  })
  const queryEmbedding = embRes.data[0].embedding

  // 2. Vector search in pgvector (top 6 chunks)
  const { data: chunks, error: searchError } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_count: 6,
  })

  if (searchError) {
    res.status(500).json({ error: searchError.message })
    return
  }

  // 3. Build context from retrieved chunks
  const context = (chunks as any[])
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join('\n\n')

  // 4. Ask Claude
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `你是用户的个人知识助手。根据以下从播客文字稿中检索到的段落回答用户的问题。
      
如果相关内容不足，请直接说明。回答要简洁有用，可以用列表或分段。

检索到的段落：
${context}

用户问题：${question}`,
    }],
  })

  const answer = (msg.content[0] as any).text
  const sourceChunkIds = (chunks as any[]).map(c => c.id)
  const episodeIds = [...new Set((chunks as any[]).map(c => c.episode_id))]

  // 5. Save note
  let noteId: string | undefined
  if (saveNote) {
    const { data: note } = await supabase
      .from('notes')
      .insert({ question, answer, source_chunks: sourceChunkIds, episode_ids: episodeIds })
      .select('id')
      .single()
    noteId = note?.id
  }

  res.status(200).json({ answer, noteId, sourceChunkIds, episodeIds })
}
```

- [ ] **Step 2: Create the `match_chunks` Postgres function in Supabase SQL editor**

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  episode_id uuid,
  chunk_index integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    episode_id,
    chunk_index,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM episode_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

Run in Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Q&A API route with vector search"
```

---

## Phase 5 — Frontend Foundation

### Task 9: Router and Layout

**Files:**
- Create: `src/router.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/Layout.tsx`

- [ ] **Step 1: Create `src/router.tsx`**

```typescript
import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { Today } from './pages/Today'
import { Archive } from './pages/Archive'
import { EpisodeDetail } from './pages/EpisodeDetail'
import { Notes } from './pages/Notes'
import { Ask } from './pages/Ask'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: 'archive', element: <Archive /> },
      { path: 'episode/:id', element: <EpisodeDetail /> },
      { path: 'notes', element: <Notes /> },
      { path: 'ask', element: <Ask /> },
    ],
  },
])
```

- [ ] **Step 2: Update `src/App.tsx`**

```typescript
import { RouterProvider } from 'react-router'
import { router } from './router'

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 3: Create stub pages (so router doesn't crash)**

Create each of the following with a minimal stub:

```typescript
// src/pages/Today.tsx
export function Today() { return <div>Today</div> }

// src/pages/Archive.tsx
export function Archive() { return <div>Archive</div> }

// src/pages/EpisodeDetail.tsx
export function EpisodeDetail() { return <div>Episode</div> }

// src/pages/Notes.tsx
export function Notes() { return <div>Notes</div> }

// src/pages/Ask.tsx
export function Ask() { return <div>Ask</div> }
```

- [ ] **Step 4: Create `src/components/Layout.tsx`**

```typescript
import { Link, Outlet, useLocation } from 'react-router'
import { AudioPlayer } from './AudioPlayer'

const navLinks = [
  { path: '/', label: '今日' },
  { path: '/archive', label: '存档' },
  { path: '/notes', label: '笔记本' },
  { path: '/ask', label: '提问' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgba(247,247,245,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)',
        }}
      >
        <nav className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            每日播客
          </Link>
          <div className="flex items-center gap-1">
            {navLinks.map(link => {
              const active = pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3 py-1.5 text-sm rounded-md transition-colors"
                  style={{
                    borderRadius: 'var(--radius)',
                    backgroundColor: active ? 'var(--card)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--muted)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      <AudioPlayer />
    </div>
  )
}
```

- [ ] **Step 5: Verify routing works**

```bash
npm run dev
```

Navigate to `/`, `/archive`, `/notes`, `/ask` — each should render the stub text without errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add router and layout shell"
```

---

### Task 10: Audio player hook and component

**Files:**
- Create: `src/hooks/useAudioPlayer.ts`
- Create: `src/components/AudioPlayer.tsx`

- [ ] **Step 1: Create `src/hooks/useAudioPlayer.ts`**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import type { Episode } from '../types'

interface AudioPlayerState {
  episode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: number
  play: (episode: Episode) => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  skip: (seconds: number) => void
  setSpeed: (speed: number) => void
}

// Module-level ref so state is shared across all components
let audioRef: HTMLAudioElement | null = null

export function useAudioPlayer(): AudioPlayerState {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeedState] = useState(1)

  useEffect(() => {
    if (!audioRef) {
      audioRef = new Audio()
    }
    const audio = audioRef

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const play = useCallback((ep: Episode) => {
    if (!audioRef) return
    audioRef.src = ep.audio_url
    audioRef.playbackRate = speed
    audioRef.play()
    setEpisode(ep)
    setIsPlaying(true)
  }, [speed])

  const pause = useCallback(() => {
    audioRef?.pause()
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    audioRef?.play()
    setIsPlaying(true)
  }, [])

  const seek = useCallback((seconds: number) => {
    if (!audioRef) return
    audioRef.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const skip = useCallback((seconds: number) => {
    if (!audioRef) return
    audioRef.currentTime = Math.max(0, audioRef.currentTime + seconds)
  }, [])

  const setSpeed = useCallback((s: number) => {
    if (audioRef) audioRef.playbackRate = s
    setSpeedState(s)
  }, [])

  return { episode, isPlaying, currentTime, duration, speed, play, pause, resume, seek, skip, setSpeed }
}
```

- [ ] **Step 2: Create `src/components/AudioPlayer.tsx`**

```typescript
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { formatDuration, formatDate } from '../lib/utils'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function AudioPlayer() {
  const { episode, isPlaying, currentTime, duration, speed, pause, resume, seek, skip, setSpeed } =
    useAudioPlayer()

  if (!episode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: 'rgba(247,247,245,0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* progress bar */}
      <div
        className="h-0.5 cursor-pointer"
        style={{ backgroundColor: 'var(--border)' }}
        onClick={e => {
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          seek(pct * duration)
        }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
        {/* episode info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
            {episode.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {formatDuration(Math.floor(currentTime))} / {formatDuration(episode.duration_sec)}
          </p>
        </div>

        {/* controls */}
        <div className="flex items-center gap-3">
          <button onClick={() => skip(-15)} className="p-1.5 transition-opacity hover:opacity-60">
            <SkipBack size={18} color="var(--foreground)" />
          </button>
          <button
            onClick={isPlaying ? pause : resume}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--foreground)' }}
          >
            {isPlaying
              ? <Pause size={16} fill="var(--bg)" color="var(--bg)" />
              : <Play size={16} fill="var(--bg)" color="var(--bg)" />
            }
          </button>
          <button onClick={() => skip(15)} className="p-1.5 transition-opacity hover:opacity-60">
            <SkipForward size={18} color="var(--foreground)" />
          </button>
        </div>

        {/* speed */}
        <div className="flex items-center gap-1">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                borderRadius: 'var(--radius)',
                backgroundColor: speed === s ? 'var(--foreground)' : 'transparent',
                color: speed === s ? 'var(--bg)' : 'var(--muted)',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify player renders and works**

```bash
npm run dev
```

Temporarily add to `Today.tsx`:
```typescript
import { useAudioPlayer } from '../hooks/useAudioPlayer'
export function Today() {
  const { play } = useAudioPlayer()
  return (
    <button onClick={() => play({
      id: 'test', date: '2026-05-07', title: '测试播客',
      summary_text: '', audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration_sec: 300, source_count: 1, created_at: ''
    })}>
      Play test
    </button>
  )
}
```

Click "Play test" — player dock should appear at bottom with working controls.

Remove the test code from `Today.tsx` when confirmed.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add audio player hook and dock component"
```

---

### Task 11: TranscriptView with chunk highlighting

**Files:**
- Create: `src/components/TranscriptView.tsx`

- [ ] **Step 1: Create `src/components/TranscriptView.tsx`**

```typescript
import { useEffect, useRef } from 'react'
import type { EpisodeChunk } from '../types'

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  currentTime: number
  duration: number
}

// Determine active chunk by evenly distributing playback time across chunks.
function getActiveChunkIndex(currentTime: number, duration: number, total: number): number {
  if (duration === 0 || total === 0) return 0
  return Math.min(Math.floor((currentTime / duration) * total), total - 1)
}

export function TranscriptView({ chunks, currentTime, duration }: TranscriptViewProps) {
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="space-y-4">
      {chunks.map((chunk, i) => {
        const isActive = i === activeIndex
        return (
          <div
            key={chunk.id}
            ref={isActive ? activeRef : undefined}
            className="px-4 py-3 rounded-md transition-all duration-300"
            style={{
              borderRadius: 'var(--radius)',
              backgroundColor: isActive ? '#e8f0fe' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
            }}
          >
            <p
              className="text-base leading-8"
              style={{
                color: isActive ? 'var(--foreground)' : 'var(--muted)',
                transition: 'color 0.3s',
              }}
            >
              {chunk.content}
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add transcript view with chunk highlighting"
```

---

### Task 12: NoteCard component

**Files:**
- Create: `src/components/NoteCard.tsx`

- [ ] **Step 1: Create `src/components/NoteCard.tsx`**

```typescript
import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Note } from '../types'
import { formatDate } from '../lib/utils'

interface NoteCardProps {
  note: Note
  episodeDateMap: Record<string, string>  // episodeId → date string
  onContinue?: (question: string) => void
}

export function NoteCard({ note, episodeDateMap, onContinue }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const answerPreview = note.answer.slice(0, 120) + (note.answer.length > 120 ? '...' : '')

  return (
    <div
      className="p-4 border rounded-md"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      {/* question */}
      <p className="font-semibold text-sm mb-2" style={{ color: 'var(--foreground)' }}>
        {note.question}
      </p>

      {/* answer (collapsed/expanded) */}
      <p className="text-sm leading-7 mb-3" style={{ color: 'var(--muted)' }}>
        {expanded ? note.answer : answerPreview}
      </p>

      {/* footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* source badges */}
          {note.episode_ids.map(eid => {
            const date = episodeDateMap[eid]
            if (!date) return null
            return (
              <Link
                key={eid}
                to={`/episode/${eid}`}
                className="text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: '#eff6ff',
                  color: 'var(--accent)',
                  borderRadius: '999px',
                }}
              >
                {formatDate(date)}
              </Link>
            )
          })}
          {/* tags */}
          {note.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--muted)',
                borderRadius: '999px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onContinue && (
            <button
              onClick={() => onContinue(note.question)}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              继续追问
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 transition-opacity hover:opacity-60"
          >
            {expanded
              ? <ChevronUp size={14} color="var(--muted)" />
              : <ChevronDown size={14} color="var(--muted)" />}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add NoteCard component"
```

---

## Phase 6 — Pages

### Task 13: Today page

**Files:**
- Modify: `src/pages/Today.tsx`

- [ ] **Step 1: Implement `src/pages/Today.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { formatDate } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { Play } from 'lucide-react'

export function Today() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [loading, setLoading] = useState(true)
  const { play, isPlaying, currentTime, duration, episode: currentEp, pause, resume } =
    useAudioPlayer()

  useEffect(() => {
    async function load() {
      const { data: ep } = await supabase
        .from('episodes')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (!ep) { setLoading(false); return }
      setEpisode(ep)

      const { data: ch } = await supabase
        .from('episode_chunks')
        .select('id, episode_id, chunk_index, content')
        .eq('episode_id', ep.id)
        .order('chunk_index')

      setChunks(ch ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>
  }

  if (!episode) {
    return (
      <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
        <p className="text-lg mb-2">今日播客正在生成</p>
        <p className="text-sm">每天早晨 6:00 自动更新</p>
      </div>
    )
  }

  const isThisEpisodePlaying = currentEp?.id === episode.id && isPlaying

  return (
    <div>
      {/* header */}
      <div className="mb-8">
        <p className="text-xs mb-2 tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
          {formatDate(episode.date)} · {episode.source_count} 封订阅
        </p>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
          {episode.title}
        </h1>
        <button
          onClick={() => isThisEpisodePlaying ? pause() : (currentEp?.id === episode.id ? resume() : play(episode))}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: 'var(--radius)',
          }}
        >
          <Play size={14} fill="var(--bg)" />
          {isThisEpisodePlaying ? '暂停' : '播放'}
        </button>
      </div>

      {/* transcript */}
      <TranscriptView
        chunks={chunks}
        currentTime={currentEp?.id === episode.id ? currentTime : 0}
        duration={currentEp?.id === episode.id ? duration : episode.duration_sec}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement Today page"
```

---

### Task 14: Archive page

**Files:**
- Modify: `src/pages/Archive.tsx`

- [ ] **Step 1: Implement `src/pages/Archive.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { formatDate, formatDuration } from '../lib/utils'
import type { Episode } from '../types'

export function Archive() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('episodes')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setEpisodes(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
        历史存档
      </h1>
      <div className="space-y-3">
        {episodes.map(ep => (
          <Link
            key={ep.id}
            to={`/episode/${ep.id}`}
            className="flex items-center justify-between p-4 border rounded-md transition-all hover:shadow-md"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                {formatDate(ep.date)} · {ep.source_count} 封订阅
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {ep.title}
              </p>
            </div>
            <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--muted)' }}>
              {formatDuration(ep.duration_sec)}
            </span>
          </Link>
        ))}
        {episodes.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: 'var(--muted)' }}>
            还没有历史记录
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement Archive page"
```

---

### Task 15: EpisodeDetail page

**Files:**
- Modify: `src/pages/EpisodeDetail.tsx`

- [ ] **Step 1: Implement `src/pages/EpisodeDetail.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { NoteCard } from '../components/NoteCard'
import { formatDate } from '../lib/utils'
import { useNavigate } from 'react-router'
import type { Episode, EpisodeChunk, Note } from '../types'
import { Play, ArrowLeft } from 'lucide-react'

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const { play, isPlaying, currentTime, duration, episode: currentEp, pause, resume } =
    useAudioPlayer()

  useEffect(() => {
    if (!id) return
    async function load() {
      const [{ data: ep }, { data: ch }, { data: ns }] = await Promise.all([
        supabase.from('episodes').select('*').eq('id', id!).single(),
        supabase.from('episode_chunks').select('id, episode_id, chunk_index, content')
          .eq('episode_id', id!).order('chunk_index'),
        supabase.from('notes').select('*').contains('episode_ids', [id!])
          .order('created_at', { ascending: false }),
      ])
      setEpisode(ep)
      setChunks(ch ?? [])
      setNotes(ns ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>
  if (!episode) return <div className="text-sm" style={{ color: 'var(--muted)' }}>未找到</div>

  const isThisEpisodePlaying = currentEp?.id === episode.id && isPlaying
  const episodeDateMap = { [episode.id]: episode.date }

  return (
    <div>
      <Link
        to="/archive"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-opacity hover:opacity-60"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} /> 返回存档
      </Link>

      <div className="mb-8">
        <p className="text-xs mb-2 tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
          {formatDate(episode.date)} · {episode.source_count} 封订阅
        </p>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
          {episode.title}
        </h1>
        <button
          onClick={() => isThisEpisodePlaying ? pause() : (currentEp?.id === episode.id ? resume() : play(episode))}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: 'var(--radius)',
          }}
        >
          <Play size={14} fill="var(--bg)" />
          {isThisEpisodePlaying ? '暂停' : '播放'}
        </button>
      </div>

      <TranscriptView
        chunks={chunks}
        currentTime={currentEp?.id === episode.id ? currentTime : 0}
        duration={currentEp?.id === episode.id ? duration : episode.duration_sec}
      />

      {notes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            本期笔记
          </h2>
          <div className="space-y-3">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                episodeDateMap={episodeDateMap}
                onContinue={q => navigate(`/ask?q=${encodeURIComponent(q)}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement EpisodeDetail page"
```

---

### Task 16: Notes page

**Files:**
- Modify: `src/pages/Notes.tsx`

- [ ] **Step 1: Implement `src/pages/Notes.tsx`**

```typescript
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { NoteCard } from '../components/NoteCard'
import type { Note, Episode } from '../types'
import { Search } from 'lucide-react'

export function Notes() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('episodes').select('id, date'),
    ]).then(([{ data: ns }, { data: eps }]) => {
      setNotes(ns ?? [])
      setEpisodes((eps as Episode[]) ?? [])
      setLoading(false)
    })
  }, [])

  const episodeDateMap = useMemo(() =>
    Object.fromEntries(episodes.map(e => [e.id, e.date])),
    [episodes]
  )

  const allTags = useMemo(() =>
    [...new Set(notes.flatMap(n => n.tags))].sort(),
    [notes]
  )

  const filtered = useMemo(() => notes.filter(n => {
    const matchSearch = !search ||
      n.question.toLowerCase().includes(search.toLowerCase()) ||
      n.answer.toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || n.tags.includes(activeTag)
    return matchSearch && matchTag
  }), [notes, search, activeTag])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
        笔记本
      </h1>

      {/* search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--muted)" />
        <input
          type="text"
          placeholder="搜索笔记..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-md outline-none"
          style={{
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="text-xs px-3 py-1 rounded-full transition-colors"
              style={{
                borderRadius: '999px',
                backgroundColor: activeTag === tag ? 'var(--foreground)' : 'var(--card)',
                color: activeTag === tag ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid var(--border)`,
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* notes */}
      <div className="space-y-3">
        {filtered.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            episodeDateMap={episodeDateMap}
            onContinue={q => navigate(`/ask?q=${encodeURIComponent(q)}`)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: 'var(--muted)' }}>
            {search || activeTag ? '没有匹配的笔记' : '还没有笔记，去提问试试'}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement Notes page"
```

---

### Task 17: Ask page

**Files:**
- Modify: `src/pages/Ask.tsx`

- [ ] **Step 1: Implement `src/pages/Ask.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router'
import { formatDate } from '../lib/utils'
import { ArrowRight, BookmarkPlus, Loader2 } from 'lucide-react'

interface AskResult {
  answer: string
  noteId?: string
  episodeIds: string[]
}

export function Ask() {
  const [searchParams] = useSearchParams()
  const [question, setQuestion] = useState(searchParams.get('q') ?? '')
  const [result, setResult] = useState<AskResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-submit if question comes from URL param
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) submit(q)
  }, [])

  async function submit(q = question) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
    setSaved(false)

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, saveNote: false }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  async function saveNote() {
    if (!result) return
    await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, saveNote: true }),
    })
    setSaved(true)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--foreground)' }}>
        提问
      </h1>

      {/* search box */}
      <form
        onSubmit={e => { e.preventDefault(); submit() }}
        className="flex gap-2 mb-8"
      >
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="问任何关于订阅内容的问题..."
          className="flex-1 px-4 py-3 text-sm border rounded-md outline-none"
          style={{
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)',
          }}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 rounded-md transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: 'var(--radius)',
          }}
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <ArrowRight size={16} />
          }
        </button>
      </form>

      {/* result */}
      {result && (
        <div
          className="p-5 border rounded-md mb-4"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-card)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>
            {question}
          </p>
          <p className="text-sm leading-7 mb-4" style={{ color: 'var(--foreground)' }}>
            {result.answer}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {result.episodeIds.map(eid => (
                <Link
                  key={eid}
                  to={`/episode/${eid}`}
                  className="text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                  style={{ backgroundColor: '#eff6ff', color: 'var(--accent)', borderRadius: '999px' }}
                >
                  来源
                </Link>
              ))}
            </div>
            {!saved ? (
              <button
                onClick={saveNote}
                className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <BookmarkPlus size={14} />
                保存为笔记
              </button>
            ) : (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>✓ 已保存</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement Ask page"
```

---

## Phase 7 — Deploy

### Task 18: Deploy to Vercel

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Install Vercel CLI and login**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Add all env vars to Vercel**

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add GMAIL_CLIENT_ID
vercel env add GMAIL_CLIENT_SECRET
vercel env add GMAIL_REFRESH_TOKEN
vercel env add TRIGGER_SECRET_KEY
vercel env add VITE_APP_URL
```

For `VITE_APP_URL`, use your Vercel deployment URL (e.g., `https://podcast-digest.vercel.app`).

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

Expected: Deployment URL printed.

- [ ] **Step 4: Smoke test**

1. Visit `<url>/` — should show "今日播客正在生成" or a real episode
2. Visit `<url>/api/rss` — should return XML
3. Visit `<url>/archive` — should load without error
4. Visit `<url>/notes` — should load without error
5. Visit `<url>/ask`, type a question, submit — should return an answer

- [ ] **Step 5: Test RSS in podcast app**

Copy `<url>/api/rss` into Pocket Casts or Apple Podcasts as a custom RSS feed.
Verify the episode appears and audio plays.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "chore: finalize vercel deploy config"
```

---

## Milestone Summary

| After Task | Working Software |
|---|---|
| Task 4 | Database schema live in Supabase |
| Task 6 | Daily job running in Trigger.dev (can be triggered manually) |
| Task 8 | RSS feed and Q&A API routes deployable |
| Task 12 | All UI components built |
| Task 17 | Full app locally functional |
| Task 18 | Live on Vercel, RSS subscribable |

## Run all tests

```bash
npm test -- --run
```
Expected: ~9 tests passing across utils, chunker, rss test files.
