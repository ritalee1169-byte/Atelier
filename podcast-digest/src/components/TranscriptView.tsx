import { useEffect, useRef, useState, useCallback } from 'react'
import type { EpisodeChunk } from '../types'
import { Highlighter, Eraser, PenLine, MessageCircle, Check, X, Play } from 'lucide-react'

export interface Highlight { text: string; color: string }

interface ToolbarState {
  type: 'new' | 'existing'
  text: string
  chunkIndex: number
  x: number
  y: number
  mode: 'default' | 'thought'
  thought: string
}

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  episodeId: string
  highlights: Highlight[]
  activeColor: string
  currentTime: number
  duration: number
  isPlaying?: boolean
  onHighlightSaved?: (hl: Highlight) => void
  onHighlightRemoved?: (text: string) => void
  onAskHighlight?: (text: string) => void
  onSeekToChunk?: (chunkIndex: number) => void
}

function getActiveChunkIndex(t: number, dur: number, total: number): number {
  if (dur === 0 || total === 0) return -1
  return Math.min(Math.floor((t / dur) * total), total - 1)
}

function getChunkIndexForNode(node: Node, container: HTMLElement): number {
  let cur: Node | null = node
  while (cur && cur.parentElement !== container) cur = cur.parentNode
  if (!cur) return -1
  return Array.from(container.children).indexOf(cur as Element)
}

function insertMark(html: string, searchText: string, color: string): string {
  if (!searchText) return html
  const vis: string[] = []
  const ps: number[] = []
  const pe: number[] = []
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i); i = (end < 0 ? html.length - 1 : end) + 1
    } else if (html.startsWith('&amp;', i)) {
      vis.push('&'); ps.push(i); pe.push(i + 5); i += 5
    } else if (html.startsWith('&lt;', i)) {
      vis.push('<'); ps.push(i); pe.push(i + 4); i += 4
    } else if (html.startsWith('&gt;', i)) {
      vis.push('>'); ps.push(i); pe.push(i + 4); i += 4
    } else {
      vis.push(html[i]); ps.push(i); pe.push(i + 1); i++
    }
  }
  const visStr = vis.join('')
  const idx = visStr.indexOf(searchText)
  if (idx < 0 || idx + searchText.length - 1 >= ps.length) return html
  const hStart = ps[idx]
  const hEnd = pe[idx + searchText.length - 1]
  const tag = `<mark data-hl="1" style="background:${color};border-radius:3px;padding:0 2px;cursor:pointer">`
  return html.slice(0, hStart) + tag + html.slice(hStart, hEnd) + '</mark>' + html.slice(hEnd)
}

function toHtml(text: string, highlights: Highlight[]): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/---/g, '<span class="md-hr"></span>')
  for (const hl of highlights) {
    try { html = insertMark(html, hl.text, hl.color) } catch { /* skip */ }
  }
  return html
}

function Divider() {
  return <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
}

function TBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px',
        fontSize: 12, fontWeight: 500,
        color: danger ? '#fca5a5' : 'white',
        borderRadius: 7,
        background: 'transparent',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
      className="hover:bg-white/10 transition-colors"
    >
      {icon}
      {label}
    </button>
  )
}

export function TranscriptView({
  chunks, episodeId, highlights, activeColor, currentTime, duration, isPlaying,
  onHighlightSaved, onHighlightRemoved, onAskHighlight, onSeekToChunk,
}: TranscriptViewProps) {
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const containerRef = useRef<HTMLDivElement>(null)
  const thoughtInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const prevActiveRef = useRef<number>(-2)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)
  const [hoveredChunk, setHoveredChunk] = useState<number | null>(null)

  // Auto-scroll only when audio naturally advances one paragraph — not on seek/restore/jump
  useEffect(() => {
    const prev = prevActiveRef.current
    prevActiveRef.current = activeIndex
    if (!isPlaying || activeIndex < 0 || activeIndex !== prev + 1) return
    const el = containerRef.current?.children[activeIndex] as HTMLElement | undefined
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIndex, isPlaying])

  useEffect(() => {
    if (toolbar?.mode === 'thought') {
      setTimeout(() => thoughtInputRef.current?.focus(), 30)
    }
  }, [toolbar?.mode])

  // Selection → show toolbar
  const handleSelectionEnd = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || text.length < 5) return

      const range = sel!.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const chunkIndex = containerRef.current
        ? getChunkIndexForNode(range.startContainer, containerRef.current)
        : -1
      const isExisting = highlights.some(h => h.text === text)

      setToolbar({
        type: isExisting ? 'existing' : 'new',
        text,
        chunkIndex,
        x: Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2)),
        y: Math.max(12, rect.top - 50),
        mode: 'default',
        thought: '',
      })
    }, 50)
  }, [highlights])

  // Click on highlight mark → show toolbar
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Walk up to find the <mark data-hl> element in case we clicked a child node
    let el = e.target as HTMLElement | null
    while (el && !el.dataset.hl) el = el.parentElement
    if (!el) return
    const text = el.textContent ?? ''
    if (!text) return
    const rect = el.getBoundingClientRect()
    const chunkIndex = containerRef.current
      ? getChunkIndexForNode(el, containerRef.current)
      : -1
    window.getSelection()?.removeAllRanges()
    setToolbar({
      type: 'existing',
      text,
      chunkIndex,
      x: Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2)),
      y: Math.max(12, rect.top - 50),
      mode: 'default',
      thought: '',
    })
  }, [])

  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-toolbar]')) setToolbar(null)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [])

  // Actions
  const doHighlight = useCallback(async () => {
    if (!toolbar || savingRef.current) return
    savingRef.current = true
    const { text } = toolbar
    setToolbar(null)
    window.getSelection()?.removeAllRanges()
    try {
      await fetch('/api/highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, color: activeColor, episodeId }),
      })
      onHighlightSaved?.({ text, color: activeColor })
    } finally { savingRef.current = false }
  }, [toolbar, activeColor, episodeId, onHighlightSaved])

  const doRemove = useCallback(async () => {
    if (!toolbar) return
    const { text } = toolbar
    setToolbar(null)
    fetch('/api/highlight', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, episodeId }),
    })
    onHighlightRemoved?.(text)
  }, [toolbar, episodeId, onHighlightRemoved])

  const doAsk = useCallback(() => {
    if (!toolbar) return
    const { text } = toolbar
    setToolbar(null)
    window.getSelection()?.removeAllRanges()
    onAskHighlight?.(text)
  }, [toolbar, onAskHighlight])

  const doSaveThought = useCallback(async () => {
    if (!toolbar || !toolbar.thought.trim() || savingRef.current) return
    savingRef.current = true
    const { text, thought, chunkIndex: ci, type } = toolbar
    setToolbar(null)
    window.getSelection()?.removeAllRanges()
    try {
      if (type === 'new') {
        await fetch('/api/highlight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, color: activeColor, episodeId }),
        })
        onHighlightSaved?.({ text, color: activeColor })
      }
      await fetch('/api/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, thought, episodeId, chunkIndex: ci }),
      })
    } finally { savingRef.current = false }
  }, [toolbar, activeColor, episodeId, onHighlightSaved])

  return (
    <div
      onMouseUp={handleSelectionEnd}
      onTouchEnd={handleSelectionEnd}
      onClick={handleClick}
      className="relative"
    >
      {/* floating toolbar (appears on text selection) */}
      {toolbar && (
        <div
          data-toolbar="true"
          style={{
            position: 'fixed',
            left: toolbar.x, top: toolbar.y,
            transform: 'translateX(-50%)',
            zIndex: 60,
            backgroundColor: '#1a1a1a',
            borderRadius: 10,
            padding: '3px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* selected text preview */}
          <div style={{
            padding: '4px 10px 2px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {toolbar.text.length > 40 ? toolbar.text.slice(0, 40) + '…' : toolbar.text}
          </div>

          {toolbar.mode === 'default' ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {toolbar.type === 'new' ? (
                <TBtn icon={<Highlighter size={13} />} label="划线" onClick={doHighlight} />
              ) : (
                <TBtn icon={<Eraser size={13} />} label="取消划线" onClick={doRemove} danger />
              )}
              <Divider />
              <TBtn
                icon={<PenLine size={13} />}
                label="写想法"
                onClick={() => setToolbar(t => t ? { ...t, mode: 'thought' } : t)}
              />
              <Divider />
              <TBtn icon={<MessageCircle size={13} />} label="问 AI" onClick={doAsk} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                ref={thoughtInputRef}
                value={toolbar.thought}
                onChange={e => setToolbar(t => t ? { ...t, thought: e.target.value } : t)}
                onKeyDown={e => {
                  if (e.key === 'Enter') doSaveThought()
                  if (e.key === 'Escape') setToolbar(t => t ? { ...t, mode: 'default', thought: '' } : t)
                }}
                placeholder="写下你的想法..."
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'white', fontSize: 13, padding: '5px 10px',
                  width: 220, fontFamily: 'inherit',
                }}
              />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={doSaveThought}
                disabled={!toolbar.thought.trim()}
                style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  backgroundColor: toolbar.thought.trim() ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: toolbar.thought.trim() ? 'pointer' : 'default',
                }}
              >
                <Check size={13} />
              </button>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setToolbar(t => t ? { ...t, mode: 'default', thought: '' } : t)}
                style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef}>
        {chunks.map((chunk, i) => {
          const isActive = i === activeIndex && activeIndex >= 0
          const isHovered = i === hoveredChunk
          return (
            <div
              key={chunk.id}
              style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}
              onMouseEnter={() => setHoveredChunk(i)}
              onMouseLeave={() => setHoveredChunk(null)}
            >
              {/* 听当前 cursor button */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={e => { e.stopPropagation(); onSeekToChunk?.(i) }}
                style={{
                  flexShrink: 0,
                  width: '1.6rem',
                  paddingTop: 'calc(1.9em * 0.18)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  opacity: isActive ? 1 : (isHovered ? 0.5 : 0),
                  transition: 'opacity 0.15s',
                  cursor: 'pointer',
                  color: isActive ? 'var(--accent, #3b82f6)' : '#999',
                  pointerEvents: isHovered || isActive ? 'auto' : 'none',
                }}
                title="听当前"
              >
                <Play size={11} fill="currentColor" />
              </button>

              <p
                dangerouslySetInnerHTML={{ __html: toHtml(chunk.content, highlights) }}
                style={{
                  flex: 1,
                  fontSize: '1.05rem',
                  lineHeight: '1.9',
                  marginBottom: '1.8em',
                  color: isActive ? '#111' : '#666',
                  paddingLeft: '0.4rem',
                  borderLeft: isActive ? '2px solid var(--accent, #3b82f6)' : (isHovered ? '2px solid #e5e7eb' : '2px solid transparent'),
                  transition: 'color 0.4s ease, border-color 0.3s ease',
                }}
              />
            </div>
          )
        })}
      </div>

      <style>{`
        .md-hr { display:block; height:1px; background:rgba(0,0,0,0.08); margin:0.75em 0 }
        mark { color:inherit }
        mark:hover { filter:brightness(0.9) }
      `}</style>
    </div>
  )
}
