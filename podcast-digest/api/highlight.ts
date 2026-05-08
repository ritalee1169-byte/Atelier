import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { text, color, episodeId } = req.body as { text: string; color?: string; episodeId?: string }
    if (!text?.trim()) { res.status(400).json({ error: 'text required' }); return }

    await db().from('notes').insert({
      question: text,
      answer: color ?? '#fef08a',
      source_chunks: [],
      episode_ids: episodeId ? [episodeId] : [],
      tags: ['划线'],
    })
    res.status(200).json({ ok: true })
    return
  }

  if (req.method === 'DELETE') {
    const { text, episodeId } = req.body as { text: string; episodeId?: string }
    if (!text?.trim()) { res.status(400).json({ error: 'text required' }); return }

    const supabase = db()
    if (episodeId) {
      await supabase.from('notes').delete()
        .eq('question', text).contains('tags', ['划线']).contains('episode_ids', [episodeId])
    } else {
      await supabase.from('notes').delete()
        .eq('question', text).contains('tags', ['划线'])
    }
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).end()
}
