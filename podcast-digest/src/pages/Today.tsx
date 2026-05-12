import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView, type Highlight, type SourceEmail } from '../components/TranscriptView'
import { formatDate, formatDuration } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { RotateCcw, RotateCw, MoreHorizontal } from 'lucide-react'

function episodeGradient(date: string) {
  const hash = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const pairs: [number, number][] = [[210, 270], [160, 220], [20, 60], [280, 330], [350, 30]]
  const [h1, h2] = pairs[hash % pairs.length]
  return `conic-gradient(from ${hash % 360}deg, hsl(${h1},60%,55%), hsl(${h2},55%,62%), hsl(${h1},60%,55%))`
}

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function Today() {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [sources, setSources] = useState<SourceEmail[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [showToc, setShowToc] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const [allEpisodes, setAllEpisodes] = useState<{ id: string; date: string; title: string }[]>([])

  const { play, pause, resume, skip, seek, setSpeed, isPlaying, currentTime, duration, speed, episode: currentEp } =
    useAudioPlayer()

  const isThisEp = currentEp?.id === episode?.id
  const effectiveTime = isThisEp ? currentTime : 0
  const effectiveDuration = isThisEp
    ? (duration > 0 ? duration : (episode?.duration_sec ?? 0))
    : (episode?.duration_sec ?? 0)
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

      const [{ data: ch }, { data: notes }, { data: allEps }, emailsRes] = await Promise.all([
        supabase
          .from('episode_chunks')
          .select('id, episode_id, chunk_index, content, source_email_idx')
          .eq('episode_id', ep.id)
          .order('chunk_index'),
        supabase
          .from('notes')
          .select('question, answer')
          .contains('episode_ids', [ep.id])
          .contains('tags', ['划线']),
        supabase
          .from('episodes')
          .select('id, date, title')
          .order('date', { ascending: false })
          .limit(30),
        fetch(`/api/sources?episode_id=${ep.id}`).then(r => r.json()).catch(() => []),
      ])

      setChunks(ch ?? [])
      setSources(emailsRes ?? [])
      setHighlights(
        (notes ?? [])
          .filter(n => n.question)
          .map(n => ({ text: n.question, color: n.answer?.startsWith('#') ? n.answer : '#fef08a' }))
      )
      setAllEpisodes(allEps ?? [])
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

  useEffect(() => {
    if (!isThisEp || !isPlaying || !episode) return
    const id = setInterval(() => {
      if (currentTime > 5) localStorage.setItem(`pos:${episode.id}`, String(currentTime))
    }, 15000)
    return () => clearInterval(id)
  }, [isThisEp, isPlaying, episode, currentTime])

  useEffect(() => {
    if (!isThisEp || !episode) return
    const saved = localStorage.getItem(`pos:${episode.id}`)
    if (saved) {
      const t = parseFloat(saved)
      if (t > 5) setTimeout(() => seek(t), 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThisEp])

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
      <article style={{ paddingBottom: 112 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-xs mb-1 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              {formatDate(episode.date)} · {episode.source_count} 封订阅
            </p>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
              {episode.title}
            </h1>
          </div>
          <button
            onClick={() => setShowToc(true)}
            style={{
              flexShrink: 0, marginTop: 4,
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)',
            }}
          >
            <MoreHorizontal size={17} />
          </button>
        </div>

        <TranscriptView
          chunks={chunks}
          highlights={highlights}
          sources={sources}
          currentTime={effectiveTime}
          duration={effectiveDuration}
          autoScroll={isThisEp && isPlaying}
        />
      </article>

      {/* Fixed bottom player */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
      }}>
        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          style={{
            width: '100%', height: 3,
            backgroundColor: 'var(--border)',
            cursor: isThisEp && effectiveDuration > 0 ? 'pointer' : 'default',
            position: 'relative',
          }}
        >
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent)', transition: 'width 0.1s linear' }} />
        </div>

        <div style={{ maxWidth: 672, margin: '0 auto', padding: '0.65rem 1.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Time */}
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', minWidth: 76, flexShrink: 0 }}>
            {formatDuration(Math.floor(effectiveTime))} / {formatDuration(episode.duration_sec ?? 0)}
          </span>

          {/* Controls — centered */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <button
              onClick={() => skip(-15)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.55 }}
              className="hover:opacity-100 transition-opacity"
            >
              <RotateCcw size={19} color="var(--foreground)" />
              <span style={{ fontSize: 9, color: 'var(--foreground)' }}>15秒</span>
            </button>

            {/* Vinyl disc as play button */}
            <div
              className={isThisEp && isPlaying ? 'vinyl-spinning' : ''}
              onClick={handlePlayToggle}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: episodeGradient(episode.date),
                boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 27, height: 27, borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}>
                {isThisEp && isPlaying ? (
                  <div style={{ display: 'flex', gap: 2.5 }}>
                    <div style={{ width: 3, height: 11, borderRadius: 2, backgroundColor: '#555' }} />
                    <div style={{ width: 3, height: 11, borderRadius: 2, backgroundColor: '#555' }} />
                  </div>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#555" style={{ marginLeft: 2 }}>
                    <polygon points="5,3 20,12 5,21" />
                  </svg>
                )}
              </div>
            </div>

            <button
              onClick={() => skip(15)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.55 }}
              className="hover:opacity-100 transition-opacity"
            >
              <RotateCw size={19} color="var(--foreground)" />
              <span style={{ fontSize: 9, color: 'var(--foreground)' }}>15秒</span>
            </button>
          </div>

          {/* Speed — collapsed by default */}
          <div style={{ minWidth: 76, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            {showSpeed ? (
              <div style={{ display: 'flex', gap: 1 }}>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSpeed(s); setShowSpeed(false) }}
                    style={{
                      padding: '2px 5px', borderRadius: 5, fontSize: 10,
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
            ) : (
              <button
                onClick={() => setShowSpeed(true)}
                style={{
                  padding: '3px 9px', borderRadius: 7, fontSize: 11,
                  backgroundColor: 'var(--card)',
                  color: 'var(--muted)',
                  fontWeight: 500,
                }}
              >
                {speed}x
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right-side TOC panel */}
      {showToc && (
        <>
          <div
            onClick={() => setShowToc(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 90 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(300px, 85vw)',
            backgroundColor: 'var(--bg)',
            zIndex: 91,
            overflowY: 'auto',
            boxShadow: '-6px 0 24px rgba(0,0,0,0.1)',
            padding: '3.5rem 1.25rem 2rem',
          }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>播客目录</p>
            {allEpisodes.map(ep => {
              const isToday = ep.id === episode.id
              return (
                <Link
                  key={ep.id}
                  to={isToday ? '/' : `/episode/${ep.id}`}
                  onClick={() => setShowToc(false)}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: '0.75rem',
                    padding: '0.6rem 0',
                    borderBottom: '1px solid var(--border)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, minWidth: 44 }}>
                    {formatDate(ep.date)}
                  </span>
                  <span style={{
                    fontSize: 13, lineHeight: 1.4,
                    color: isToday ? 'var(--foreground)' : '#666',
                    fontWeight: isToday ? 600 : 400,
                  }}>
                    {ep.title}
                  </span>
                  {isToday && (
                    <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginLeft: 'auto' }}>今日</span>
                  )}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
