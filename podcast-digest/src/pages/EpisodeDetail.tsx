import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { NoteCard } from '../components/NoteCard'
import { formatDate } from '../lib/utils'
import type { Episode, EpisodeChunk, Note } from '../types'
import { Play, Pause, ArrowLeft } from 'lucide-react'

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
        supabase
          .from('episode_chunks')
          .select('id, episode_id, chunk_index, content')
          .eq('episode_id', id!)
          .order('chunk_index'),
        supabase
          .from('notes')
          .select('*')
          .contains('episode_ids', [id!])
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
