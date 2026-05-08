import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView, type Highlight } from '../components/TranscriptView'
import { formatDate, formatDuration } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { RotateCcw, RotateCw, Send } from 'lucide-react'

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

const SPEEDS = [0.75, 1, 1.25, 1.5]

const HL_COLORS = [
  { value: '#fef08a', label: '黄' },
  { value: '#bbf7d0', label: '绿' },
  { value: '#bfdbfe', label: '蓝' },
  { value: '#fecaca', label: '红' },
]

export function Today() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [sources, setSources] = useState<RawEmail[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [activeColor, setActiveColor] = useState(HL_COLORS[0].value)
  const [askQ, setAskQ] = useState('')
  const [askAnswer, setAskAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const askRef = useRef<HTMLTextAreaElement>(null)

  const { play, pause, resume, skip, seek, setSpeed, isPlaying, currentTime, duration, speed, episode: currentEp } =
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
          .select('question, answer')
          .contains('episode_ids', [ep.id])
          .contains('tags', ['划线']),
      ])

      setChunks(ch ?? [])
      setSources(emails ?? [])
      setHighlights(
        (notes ?? [])
          .filter(n => n.question)
          .map(n => ({ text: n.question, color: n.answer?.startsWith('#') ? n.answer : '#fef08a' }))
      )
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

  const handleAskHighlight = (text: string) => {
    setAskQ(text)
    setTimeout(() => {
      askRef.current?.focus()
      askRef.current?.setSelectionRange(text.length, text.length)
    }, 50)
  }

  const handleSeekToChunk = (chunkIndex: number) => {
    if (chunks.length === 0) return
    const t = (chunkIndex / chunks.length) * (effectiveDuration || episode?.duration_sec || 0)
    if (!isThisEp && episode) {
      play(episode)
      setTimeout(() => seek(t), 400)
    } else {
      seek(t)
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
    <>
      {/* right-side color picker — fixed in the margin */}
      <div style={{
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        right: 'max(12px, calc(50vw - 352px))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 40,
      }}>
        {HL_COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => setActiveColor(c.value)}
            title={c.label}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              backgroundColor: c.value,
              border: activeColor === c.value ? '2.5px solid #555' : '2.5px solid transparent',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              transition: 'border-color 0.15s, transform 0.15s',
              transform: activeColor === c.value ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <article style={{ paddingBottom: 88 }}>
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
        <div className="flex flex-col items-center mb-10" style={{ gap: '1rem' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button
              onClick={() => skip(-15)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.65 }}
              className="hover:opacity-100 transition-opacity"
            >
              <RotateCcw size={18} color="var(--foreground)" />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--foreground)' }}>15s</span>
            </button>

            <div
              className={isThisEp && isPlaying ? 'vinyl-spinning' : ''}
              onClick={handlePlayToggle}
              style={{
                width: 150, height: 150, borderRadius: '50%',
                background: episodeGradient(episode.date),
                boxShadow: '0 6px 28px rgba(0,0,0,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'scale(1.03)'
                el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'scale(1)'
                el.style.boxShadow = '0 6px 28px rgba(0,0,0,0.14)'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}>
                {isThisEp && isPlaying ? (
                  <div style={{ display: 'flex', gap: 3 }}>
                    <div style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: '#555' }} />
                    <div style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: '#555' }} />
                  </div>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#555" style={{ marginLeft: 2 }}>
                    <polygon points="5,3 20,12 5,21" />
                  </svg>
                )}
              </div>
            </div>

            <button
              onClick={() => skip(15)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.65 }}
              className="hover:opacity-100 transition-opacity"
            >
              <RotateCw size={18} color="var(--foreground)" />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--foreground)' }}>15s</span>
            </button>
          </div>

          <div
            onClick={handleProgressClick}
            style={{
              width: '100%', maxWidth: 380, height: 3,
              backgroundColor: 'var(--border)', borderRadius: 99,
              cursor: isThisEp && effectiveDuration > 0 ? 'pointer' : 'default',
              position: 'relative', marginTop: 4,
            }}
          >
            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent)', borderRadius: 99, transition: 'width 0.1s linear' }} />
            {effectiveDuration > 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                width: 11, height: 11, borderRadius: '50%',
                backgroundColor: 'var(--accent)',
              }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 380 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(Math.floor(effectiveTime))} / {formatDuration(episode.duration_sec ?? 0)}
            </span>
            <div style={{ display: 'flex', gap: 1 }}>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '2px 7px', borderRadius: 5, fontSize: 11,
                    backgroundColor: speed === s ? 'var(--foreground)' : 'transparent',
                    color: speed === s ? 'var(--bg)' : 'var(--muted)',
                    fontWeight: speed === s ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* source cards */}
        {sources.length > 0 && (
          <div className="mb-10" style={{ overflowX: 'auto', display: 'flex', gap: '0.65rem', paddingBottom: 4 }}>
            {sources.map((s, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0, minWidth: 140, maxWidth: 180,
                  backgroundColor: 'var(--card)', borderRadius: 10,
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
          activeColor={activeColor}
          currentTime={effectiveTime}
          duration={effectiveDuration}
          onHighlightSaved={hl => setHighlights(prev => [...prev, hl])}
          onHighlightRemoved={text => setHighlights(prev => prev.filter(h => h.text !== text))}
          onAskHighlight={handleAskHighlight}
          onSeekToChunk={handleSeekToChunk}
        />

        {/* sources list at end of transcript */}
        {sources.length > 0 && (
          <div className="mt-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              本期来源 · {sources.length} 封
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {sources.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, minWidth: '5rem' }}>
                    {senderName(s.sender)}
                  </span>
                  <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{s.subject}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* fixed bottom ask bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.05)',
      }}>
        {askAnswer && (
          <div style={{
            maxWidth: 672, margin: '0 auto',
            padding: '0.75rem 1.5rem 0',
            fontSize: '0.88rem', color: 'var(--foreground)', lineHeight: 1.7,
            borderBottom: '1px solid var(--border)',
          }}>
            {askAnswer}
          </div>
        )}
        <div style={{ maxWidth: 672, margin: '0 auto', padding: '0.6rem 1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
            backgroundColor: 'var(--card)', borderRadius: 12,
            padding: '0.55rem 0.55rem 0.55rem 0.85rem',
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
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                backgroundColor: askQ.trim() ? 'var(--foreground)' : 'transparent',
                color: askQ.trim() ? 'var(--bg)' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', opacity: askLoading ? 0.5 : 1,
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
