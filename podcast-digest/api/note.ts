import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { text, thought, episodeId, chunkIndex } = req.body as {
    text: string; thought: string; episodeId?: string; chunkIndex?: number
  }
  if (!text?.trim() || !thought?.trim()) { res.status(400).json({ error: 'text and thought required' }); return }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('notes').insert({
    question: text,
    answer: thought,
    source_chunks: chunkIndex !== undefined ? [chunkIndex] : [],
    episode_ids: episodeId ? [episodeId] : [],
    tags: ['想法'],
  })

  res.status(200).json({ ok: true })
}
