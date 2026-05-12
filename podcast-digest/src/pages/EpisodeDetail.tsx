import { useEffect, useRef, useState, startTransition } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TranscriptView, type Highlight, type SourceEmail } from '../components/TranscriptView'
import { formatDate, formatDuration } from '../lib/utils'
import type { Episode, EpisodeChunk } from '../types'
import { RotateCcw, RotateCw, ArrowLeft, MoreHorizontal } from 'lucide-react'

function episodeGradient(date: string) {
  const hash = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const pairs: [number, number][] = [[210, 270], [160, 220], [20, 60], [280, 330], [350, 30]]
  const [h1, h2] = pairs[hash % pairs.length]
  return `conic-gradient(from ${hash % 360}deg, hsl(${h1},60%,55%), hsl(${h2},55%,62%), hsl(${h1},60%,55%))`
}

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chunks, setChunks] = useState<EpisodeChunk[]>([])
  const [sources, setSources] = useState<SourceEmail[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [showToc, setShowToc] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const [allEpisodes, setAllEpisodes] = useState<{ id: string; date: string; title: string }[]>([])
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const { play, pause, resume, skip, seek, setSpeed, isPlaying, currentTime, duration, speed, episode: currentEp } =
    useAudioPlayer()

  const isThisEp = currentEp?.id === episode?.id
  const effectiveTime = isThisEp ? currentTime : 0
  const effectiveDuration = isThisEp
    ? (duration > 0 ? duration : (episode?.duration_sec ?? 0))
    : (episode?.duration_sec ?? 0)
  const progress = effectiveDuration > 0 ? (effectiveTime / effectiveDuration) * 100 : 0

  useEffect(() => {
    supabase
      .from('episodes')
      .select('id, date, title')
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => setAllEpisodes(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setHighlights([])
    async function load() {
      const [{ data: ep }, { data: ch }, { data: hlNotes }, emailsRes] = await Promise.all([
        supabase.from('episodes').select('*').eq('id', id!).single(),
        supabase
          .from('episode_chunks')
          .select('id, episode_id, chunk_index, content, source_email_idx')
          .eq('episode_id', id!)
          .order('chunk_index'),
        supabase
          .from('notes')
          .select('question, answer')
          .contains('episode_ids', [id!])
          .contains('tags', ['划线']),
        fetch(`/api/sources?episode_id=${id}`).then(r => r.json()).catch(() => []),
      ])
      setEpisode(ep)
      setChunks(ch ?? [])
      setSources(emailsRes ?? [])
      setHighlights(
        (hlNotes ?? [])
          .filter(n => n.question)
          .map(n => ({ text: n.question, color: n.answer?.startsWith('#') ? n.answer : '#fef08a' }))
      )
      setLoading(false)
    }
    load()
  }, [id])

  const currentIndex = allEpisodes.findIndex(e => e.id === id)
  const prevEp = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null
  const nextEp = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const target = dx < 0 ? nextEp : prevEp
    if (!target) return
    startTransition(() => navigate(`/episode/${target.id}`))
  }

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
    const timer = setInterval(() => {
      if (currentTime > 5) localStorage.setItem(`pos:${episode.id}`, String(currentTime))
    }, 15000)
    return () => clearInterval(timer)
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

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>
  if (!episode) return <div className="text-sm" style={{ color: 'var(--muted)' }}>未找到</div>

  return (
    <>
      <article
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: 112 }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--muted)',
                textDecoration: 'none', marginBottom: '0.4rem',
              }}
            >
              <ArrowLeft size={12} /> 今日
            </Link>
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
              flexShrink: 0, marginTop: 22,
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

        {/* Prev / next navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {prevEp ? (
            <Link to={`/episode/${prevEp.id}`} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
              ← {formatDate(prevEp.date)}
            </Link>
          ) : <span />}
          {nextEp ? (
            <Link to={`/episode/${nextEp.id}`} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
              {formatDate(nextEp.date)} →
            </Link>
          ) : <span />}
        </div>
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
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', minWidth: 76, flexShrink: 0 }}>
            {formatDuration(Math.floor(effectiveTime))} / {formatDuration(episode.duration_sec ?? 0)}
          </span>

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
              const isCurrent = ep.id === id
              return (
                <Link
                  key={ep.id}
                  to={`/episode/${ep.id}`}
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
                    color: isCurrent ? 'var(--foreground)' : '#666',
                    fontWeight: isCurrent ? 600 : 400,
                  }}>
                    {ep.title}
                  </span>
                  {isCurrent && (
                    <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block', marginLeft: 'auto', flexGrow: 0 }} />
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
