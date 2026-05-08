import { useEffect, useRef, useState, useCallback } from 'react'
import type { EpisodeChunk } from '../types'
import { MessageCircle } from 'lucide-react'

export interface Highlight { text: string; color: string }

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  episodeId: string
  highlights: Highlight[]
  activeColor: string
  currentTime: number
  duration: number
  onHighlightSaved?: (hl: Highlight) => void
  onHighlightRemoved?: (text: string) => void
  onAskHighlight?: (text: string) => void
}

function getActiveChunkIndex(t: number, dur: number, total: number): number {
  if (dur === 0 || total === 0) return -1
  return Math.min(Math.floor((t / dur) * total), total - 1)
}

function toHtml(text: string, highlights: Highlight[]): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/---/g, '<span class="md-hr"></span>')

  for (const hl of highlights) {
    try {
      const escaped = hl.text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      html = html.replace(
        new RegExp(escaped, 'g'),
        `<mark data-hl="1" style="background:${hl.color};border-radius:3px;padding:0 2px;cursor:default" title="点击取消划线">$&</mark>`,
      )
    } catch { /* skip */ }
  }
  return html
}

export function TranscriptView({
  chunks, episodeId, highlights, activeColor, currentTime, duration,
  onHighlightSaved, onHighlightRemoved, onAskHighlight,
}: TranscriptViewProps) {
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const containerRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)

  const [askBubble, setAskBubble] = useState<{ text: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return
    const el = containerRef.current.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  // Auto-highlight on selection — no toolbar
  const handleSelectionEnd = useCallback(() => {
    setTimeout(async () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || text.length < 5 || savingRef.current) return
      // Don't double-highlight existing marks
      if (highlights.some(h => h.text === text)) return

      savingRef.current = true
      sel!.removeAllRanges()
      try {
        await fetch('/api/highlight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, color: activeColor, episodeId }),
        })
        onHighlightSaved?.({ text, color: activeColor })
      } finally {
        savingRef.current = false
      }
    }, 80)
  }, [activeColor, episodeId, highlights, onHighlightSaved])

  // Hover over mark → show ask bubble
  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.dataset.hl) {
      const rect = target.getBoundingClientRect()
      setAskBubble({
        text: target.textContent ?? '',
        x: rect.left + rect.width / 2,
        y: rect.top - 30,
      })
    }
  }, [])

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as HTMLElement | null
    if (!related?.closest('[data-ask-bubble]') && !related?.dataset.hl) {
      setAskBubble(null)
    }
  }, [])

  // Click on mark → remove
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.dataset.hl) {
      const text = target.textContent ?? ''
      if (!text) return
      fetch('/api/highlight', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, episodeId }),
      })
      onHighlightRemoved?.(text)
      setAskBubble(null)
    }
  }, [episodeId, onHighlightRemoved])

  return (
    <div
      onMouseUp={handleSelectionEnd}
      onTouchEnd={handleSelectionEnd}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={handleClick}
      className="relative"
    >
      {/* ask bubble on mark hover */}
      {askBubble && (
        <div
          data-ask-bubble="true"
          onMouseEnter={() => { /* keep visible */ }}
          onMouseLeave={() => setAskBubble(null)}
          style={{
            position: 'fixed',
            left: askBubble.x, top: askBubble.y,
            transform: 'translateX(-50%)',
            zIndex: 50,
            backgroundColor: '#1c1c1c',
            borderRadius: 8,
            padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
          onClick={e => { e.stopPropagation(); onAskHighlight?.(askBubble.text); setAskBubble(null) }}
        >
          <MessageCircle size={11} color="white" />
          <span style={{ fontSize: 12, color: 'white', fontWeight: 500 }}>问 AI</span>
        </div>
      )}

      <div ref={containerRef}>
        {chunks.map((chunk, i) => {
          const isActive = i === activeIndex && activeIndex >= 0
          return (
            <p
              key={chunk.id}
              dangerouslySetInnerHTML={{ __html: toHtml(chunk.content, highlights) }}
              style={{
                fontSize: '1.05rem',
                lineHeight: '1.9',
                marginBottom: '1.8em',
                color: isActive ? '#111' : '#666',
                paddingLeft: '1rem',
                borderLeft: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                transition: 'color 0.4s ease, border-color 0.3s ease',
              }}
            />
          )
        })}
      </div>

      <style>{`
        .md-hr { display:block; height:1px; background:rgba(0,0,0,0.08); margin:0.75em 0 }
        mark { color:inherit }
        mark:hover { filter: brightness(0.9) }
      `}</style>
    </div>
  )
}
