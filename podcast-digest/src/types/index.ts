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
  source_email_idx?: number | null
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
