import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { formatDate } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { Play, Pause } from 'lucide-react'

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
      <div className="mb-8">
        <p className="text-xs mb-2 tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
          {formatDate(episode.date)} · {episode.source_count} 封订阅
        </p>
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
          {episode.title}
        </h1>
        <button
          onClick={() =>
            isThisEpisodePlaying
              ? pause()
              : currentEp?.id === episode.id
              ? resume()
              : play(episode)
          }
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: 'var(--radius)',
          }}
        >
          {isThisEpisodePlaying
            ? <Pause size={14} fill="var(--bg)" color="var(--bg)" />
            : <Play size={14} fill="var(--bg)" color="var(--bg)" />
          }
          {isThisEpisodePlaying ? '暂停' : '播放'}
        </button>
      </div>

      <TranscriptView
        chunks={chunks}
        currentTime={currentEp?.id === episode.id ? currentTime : 0}
        duration={currentEp?.id === episode.id ? duration : episode.duration_sec}
      />
    </div>
  )
}
