import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { NoteCard } from '../components/NoteCard'
import { formatDate } from '../lib/utils'
import type { Episode, EpisodeChunk, Note } from '../types'
import { Play, Pause, ArrowLeft } from 'lucide-react'

interface RawEmail { sender: string; subject: string }

function senderName(raw: string) {
  const m = raw.match(/^(.+?)\s*</)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : raw.split('@')[0]
}

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [sources, setSources] = useState<RawEmail[]>([])
  const [loading, setLoading] = useState(true)
  const { play, isPlaying, currentTime, duration, episode: currentEp, pause, resume } =
    useAudioPlayer()

  useEffect(() => {
    if (!id) return
    async function load() {
      const [{ data: ep }, { data: ch }, { data: ns }, { data: emails }] = await Promise.all([
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
        supabase
          .from('raw_emails')
          .select('sender, subject')
          .eq('episode_id', id!)
          .order('received_at'),
      ])
      setEpisode(ep)
      setChunks(ch ?? [])
      setNotes(ns ?? [])
      setSources(emails ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>
  if (!episode) return <div className="text-sm" style={{ color: 'var(--muted)' }}>未找到</div>

  const isThisEpisodePlaying = currentEp?.id === episode.id && isPlaying
  const episodeDateMap = { [episode.id]: episode.date }

  return (
    <article>
      <Link
        to="/archive"
        className="inline-flex items-center gap-1 text-sm mb-8 transition-opacity hover:opacity-60"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} /> 返回存档
      </Link>

      {/* header */}
      <div className="mb-10">
        <p className="text-xs mb-3 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          {formatDate(episode.date)} · {episode.source_count} 封订阅
        </p>
        <h1
          className="mb-6"
          style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--foreground)', letterSpacing: '-0.01em' }}
        >
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
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: '999px',
          }}
        >
          {isThisEpisodePlaying
            ? <Pause size={13} fill="var(--bg)" color="var(--bg)" />
            : <Play size={13} fill="var(--bg)" color="var(--bg)" />
          }
          {isThisEpisodePlaying ? '暂停' : '播放'}
        </button>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: '2rem' }} />

      <TranscriptView
        chunks={chunks}
        episodeId={episode.id}
        highlights={[]}
        activeColor="#fef08a"
        currentTime={currentEp?.id === episode.id ? currentTime : 0}
        duration={currentEp?.id === episode.id ? duration : episode.duration_sec}
      />

      {/* sources */}
      {sources.length > 0 && (
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            本期来源 · {sources.length} 封邮件
          </p>
          <div className="space-y-2">
            {sources.map((s, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="text-xs shrink-0" style={{ color: 'var(--muted)', minWidth: '5rem' }}>
                  {senderName(s.sender)}
                </span>
                <span className="text-sm" style={{ color: '#555', lineHeight: 1.5 }}>
                  {s.subject}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* notes */}
      {notes.length > 0 && (
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
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
    </article>
  )
}
