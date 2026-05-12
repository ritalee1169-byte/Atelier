import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).end(); return }

  const episodeId = req.query.episode_id as string
  if (!episodeId) { res.status(400).json({ error: 'episode_id required' }); return }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('raw_emails')
    .select('sender, subject, gmail_message_id')
    .eq('episode_id', episodeId)
    .order('received_at')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(200).json(data ?? [])
}
