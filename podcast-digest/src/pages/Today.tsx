import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView } from '../components/TranscriptView'
import { formatDate } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { Play, Pause, RotateCcw, RotateCw, Send } from 'lucide-react'

interface RawEmail { sender: string; subject: string }

function senderName(raw: string) {
  const m = raw.match(/^(.+?)\s*</)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : raw.split('@')[0]
}

function episodeGradient(date: string) {
  const hash = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const pairs: [number, number][] = [[210, 270], [160, 220], [20, 60], [280, 330], [350, 30]]
  const [h1, h2] = pairs[hash % pairs.length]
  return `conic-gradient(from ${hash % 360}deg, hsl(${h1},60%,55%), hsl(${h2},55%,62%), hsl(${h1},60%,55%))`
}

export function Today() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [sources, setSources] = useState<RawEmail[]>([])
  const [highlights, setHighlights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [askQ, setAskQ] = useState('')
  const [askAnswer, setAskAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const askRef = useRef<HTMLTextAreaElement>(null)

  const { play, pause, resume, skip, seek, isPlaying, currentTime, duration, episode: currentEp } =
    useAudioPlayer()

  const isThisEp = currentEp?.id === episode?.id
  const effectiveTime = isThisEp ? currentTime : 0
  const effectiveDuration = isThisEp ? duration : (episode?.duration_sec ?? 0)
  const progress = effectiveDuration > 0 ? (effectiveTime / effectiveDuration) * 100 : 0

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

      const [{ data: ch }, { data: emails }, { data: notes }] = await Promise.all([
        supabase
          .from('episode_chunks')
          .select('id, episode_id, chunk_index, content')
          .eq('episode_id', ep.id)
          .order('chunk_index'),
        supabase
          .from('raw_emails')
          .select('sender, subject')
          .eq('episode_id', ep.id)
          .order('received_at'),
        supabase
          .from('notes')
          .select('question')
          .contains('episode_ids', [ep.id])
          .contains('tags', ['划线']),
      ])

      setChunks(ch ?? [])
      setSources(emails ?? [])
      setHighlights((notes ?? []).map(n => n.question).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [])

  const handlePlayToggle = () => {
    if (!episode) return
    if (isThisEp && isPlaying) pause()
    else if (isThisEp) resume()
    else play(episode)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isThisEp || effectiveDuration === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek((e.clientX - rect.left) / rect.width * effectiveDuration)
  }

  const handleAsk = async () => {
    if (!askQ.trim() || askLoading) return
    setAskLoading(true)
    setAskAnswer('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: askQ, episodeId: episode?.id }),
      })
      const data = await res.json()
      setAskAnswer(data.answer ?? '暂无回答')
    } catch {
      setAskAnswer('请求失败，请稍后再试')
    } finally {
      setAskLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm py-12 text-center" style={{ color: 'var(--muted)' }}>加载中...</div>
  }

  if (!episode) {
    return (
      <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
        <p className="text-lg mb-2">今日播客正在生成</p>
        <p className="text-sm">每天早晨 6:00 自动更新</p>
      </div>
    )
  }

  return (
    <article>
      {/* title */}
      <div className="mb-8">
        <p className="text-xs mb-2 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          {formatDate(episode.date)} · {episode.source_count} 封订阅
        </p>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
          {episode.title}
        </h1>
      </div>

      {/* vinyl player */}
      <div className="flex flex-col items-center mb-10" style={{ gap: '1.25rem' }}>
        <div
          className={isThisEp && isPlaying ? 'vinyl-spinning' : ''}
          style={{
            width: 140, height: 140,
            borderRadius: '50%',
            background: episodeGradient(episode.date),
            boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.75)' }} />
        </div>

        <div className="flex items-center" style={{ gap: '1rem' }}>
          <button
            onClick={() => skip(-15)}
            className="relative flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ width: 40, height: 40 }}
            title="后退15秒"
          >
            <RotateCcw size={22} color="var(--foreground)" />
            <span style={{ position: 'absolute', bottom: 6, fontSize: 9, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>15</span>
          </button>

          <button
            onClick={handlePlayToggle}
            className="flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              width: 60, height: 60, borderRadius: '50%',
              backgroundColor: 'var(--foreground)', flexShrink: 0,
            }}
          >
            {isThisEp && isPlaying
              ? <Pause size={22} fill="var(--bg)" color="var(--bg)" />
              : <Play size={22} fill="var(--bg)" color="var(--bg)" style={{ marginLeft: 3 }} />
            }
          </button>

          <button
            onClick={() => skip(15)}
            className="relative flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ width: 40, height: 40 }}
            title="快进15秒"
          >
            <RotateCw size={22} color="var(--foreground)" />
            <span style={{ position: 'absolute', bottom: 6, fontSize: 9, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>15</span>
          </button>
        </div>

        <div
          onClick={handleProgressClick}
          style={{
            width: '100%', maxWidth: 360, height: 3,
            backgroundColor: 'var(--border)', borderRadius: 99,
            cursor: isThisEp && effectiveDuration > 0 ? 'pointer' : 'default',
            position: 'relative',
          }}
        >
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent)', borderRadius: 99, transition: 'width 0.1s linear' }} />
          {effectiveDuration > 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: 'var(--accent)',
            }} />
          )}
        </div>
      </div>

      {/* source cards */}
      {sources.length > 0 && (
        <div
          className="mb-10"
          style={{ overflowX: 'auto', display: 'flex', gap: '0.65rem', paddingBottom: 4 }}
        >
          {sources.map((s, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0, minWidth: 140, maxWidth: 180,
                backgroundColor: 'var(--card)',
                borderRadius: 10,
                padding: '0.5rem 0.75rem',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {senderName(s.sender)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {s.subject}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: '2.5rem' }} />

      {/* transcript */}
      <TranscriptView
        chunks={chunks}
        episodeId={episode.id}
        highlights={highlights}
        currentTime={effectiveTime}
        duration={effectiveDuration}
        onHighlightSaved={text => setHighlights(prev => [...prev, text])}
      />

      {/* ask AI */}
      <div className="mt-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>问 AI</p>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
          backgroundColor: 'var(--card)', borderRadius: 12,
          padding: '0.6rem 0.6rem 0.6rem 0.85rem',
        }}>
          <textarea
            ref={askRef}
            value={askQ}
            onChange={e => setAskQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
            placeholder="对本期内容有什么想问的？"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', background: 'transparent',
              fontSize: '0.9rem', color: 'var(--foreground)', outline: 'none',
              lineHeight: 1.5, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleAsk}
            disabled={askLoading || !askQ.trim()}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              backgroundColor: askQ.trim() ? 'var(--foreground)' : 'transparent',
              color: askQ.trim() ? 'var(--bg)' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', opacity: askLoading ? 0.5 : 1,
            }}
          >
            <Send size={14} />
          </button>
        </div>

        {(askLoading || askAnswer) && (
          <div style={{
            marginTop: '0.75rem', padding: '0.85rem 1rem',
            backgroundColor: 'var(--card)', borderRadius: 10,
            fontSize: '0.9rem', color: 'var(--foreground)', lineHeight: 1.75,
          }}>
            {askLoading ? <span style={{ color: 'var(--muted)' }}>思考中...</span> : askAnswer}
          </div>
        )}
      </div>
    </article>
  )
}
