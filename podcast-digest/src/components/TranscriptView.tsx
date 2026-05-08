import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { MessageCircle } from 'lucide-react'
import type { EpisodeChunk } from '../types'

export interface Highlight { text: string; color: string }

const HL_COLORS = [
  { value: '#fef08a', label: '黄' },
  { value: '#bbf7d0', label: '绿' },
  { value: '#bfdbfe', label: '蓝' },
  { value: '#fecaca', label: '红' },
]

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  episodeId: string
  highlights: Highlight[]
  currentTime: number
  duration: number
  onHighlightSaved?: (hl: Highlight) => void
  onHighlightRemoved?: (text: string) => void
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
        `<mark data-hl="1" style="background:${hl.color};cursor:pointer" title="点击取消划线">$&</mark>`,
      )
    } catch { /* skip */ }
  }
  return html
}

export function TranscriptView({
  chunks, episodeId, highlights, currentTime, duration,
  onHighlightSaved, onHighlightRemoved,
}: TranscriptViewProps) {
  const navigate = useNavigate()
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedText, setSelectedText] = useState('')
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null)
  const [activeColor, setActiveColor] = useState(HL_COLORS[0].value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return
    const el = containerRef.current.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  const handleSelectionEnd = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || text.length < 5) { setToolbarPos(null); return }
      const range = sel!.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectedText(text)
      setToolbarPos({
        x: Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2)),
        y: rect.top - 52,
      })
    }, 10)
  }, [])

  useEffect(() => {
    const hide = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-toolbar]')) setToolbarPos(null)
    }
    document.addEventListener('mousedown', hide)
    return () => document.removeEventListener('mousedown', hide)
  }, [])

  // Click on existing mark → remove it
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
    }
  }, [episodeId, onHighlightRemoved])

  const askAI = useCallback(() => {
    setToolbarPos(null)
    navigate(`/ask?q=${encodeURIComponent(selectedText)}`)
  }, [selectedText, navigate])

  const saveHighlight = useCallback(async (color: string) => {
    if (saving) return
    setSaving(true)
    const text = selectedText
    try {
      await fetch('/api/highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, color, episodeId }),
      })
      onHighlightSaved?.({ text, color })
    } finally {
      setSaving(false)
      setToolbarPos(null)
      window.getSelection()?.removeAllRanges()
    }
  }, [selectedText, episodeId, saving, onHighlightSaved])

  return (
    <div onMouseUp={handleSelectionEnd} onTouchEnd={handleSelectionEnd} className="relative">
      {toolbarPos && (
        <div
          data-toolbar="true"
          className="fixed z-50 flex items-center gap-px rounded-xl shadow-xl"
          style={{
            left: toolbarPos.x, top: toolbarPos.y,
            transform: 'translateX(-50%)',
            backgroundColor: '#1c1c1c', padding: '4px',
          }}
        >
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={askAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:bg-white/10"
          >
            <MessageCircle size={12} />问 AI
          </button>
          <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
          {HL_COLORS.map(c => (
            <button
              key={c.value}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setActiveColor(c.value); saveHighlight(c.value) }}
              disabled={saving}
              title={c.label}
              style={{
                width: 22, height: 22, borderRadius: 6,
                backgroundColor: c.value,
                border: activeColor === c.value ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
                opacity: saving ? 0.5 : 1,
              }}
            />
          ))}
        </div>
      )}

      <div ref={containerRef} onClick={handleContainerClick}>
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
        mark { padding:0 2px; border-radius:3px; color:inherit }
        mark:hover { filter: brightness(0.92) }
      `}</style>
    </div>
  )
}
