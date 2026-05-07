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

  // 2. Vector search via match_chunks RPC
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
  const sourceChunkIds = (chunks as any[]).map((c: any) => c.id)
  const episodeIds = [...new Set((chunks as any[]).map((c: any) => c.episode_id))]

  // 5. Optionally save note
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
