import { memo, useEffect, useMemo } from 'react'
import type { EpisodeChunk } from '../types'
import { resolveSourcesPerChunk, senderName, emailLink, type SourceEmail } from '../lib/sourceMatch'
import { ArrowUpRight } from 'lucide-react'

export interface Highlight { text: string; color: string }
export type { SourceEmail }

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  highlights: Highlight[]
  currentTime: number
  duration: number
  sources?: SourceEmail[]
  autoScroll?: boolean
}

function getActiveChunkIndex(t: number, dur: number, total: number): number {
  if (dur === 0 || total === 0) return -1
  return Math.min(Math.floor((t / dur) * total), total - 1)
}

function splitSentences(text: string): string[] {
  const result: string[] = []
  let current = ''
  for (const ch of text) {
    current += ch
    if ('。！？…\n'.includes(ch)) {
      if (current.trim()) result.push(current)
      current = ''
    }
  }
  if (current.trim()) result.push(current)
  return result.length > 1 ? result : [text]
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
  const tag = `<mark style="background:${color};border-radius:3px;padding:0 2px">`
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

// ── Per-chunk paragraph (memoized) ─────────────────────────────────────────

interface ChunkParagraphProps {
  sents: string[]
  isActive: boolean
  activeSentIdx: number
  sourceUrl?: string
  sourceLabel?: string
}

const ChunkParagraph = memo(function ChunkParagraph({
  sents, isActive, activeSentIdx, sourceUrl, sourceLabel,
}: ChunkParagraphProps) {
  return (
    <>
      <p
        style={{
          fontSize: '1.05rem',
          lineHeight: '1.9',
          marginBottom: sourceUrl ? '0.6em' : '1.8em',
          color: '#666',
        }}
      >
        {sents.map((html, si) => {
          const isSentActive = isActive && si === activeSentIdx
          return (
            <span
              key={si}
              data-active-sent={isSentActive ? 'true' : undefined}
              dangerouslySetInnerHTML={{ __html: html }}
              style={{
                padding: '0 2px',
                borderRadius: 3,
                backgroundColor: isSentActive ? 'rgba(254, 240, 138, 0.9)' : 'transparent',
                color: isSentActive ? '#111' : 'inherit',
              }}
            />
          )
        })}
      </p>
      {sourceUrl && sourceLabel && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            color: 'var(--muted)',
            textDecoration: 'none',
            padding: '3px 8px',
            borderRadius: 6,
            backgroundColor: 'var(--card)',
            marginBottom: '1.8em',
          }}
        >
          <ArrowUpRight size={11} />
          来自 {sourceLabel}
        </a>
      )}
    </>
  )
})

// ── Main component ────────────────────────────────────────────────────────

export function TranscriptView({
  chunks, highlights, currentTime, duration, sources = [], autoScroll = false,
}: TranscriptViewProps) {
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const chunkDuration = chunks.length > 0 && duration > 0 ? duration / chunks.length : 0
  const timeInChunk = activeIndex >= 0 ? Math.max(0, currentTime - activeIndex * chunkDuration) : 0

  const sentsPerChunk = useMemo(
    () => chunks.map(c => splitSentences(c.content).map(s => toHtml(s, highlights))),
    [chunks, highlights]
  )

  // Map each chunk to a source email (-1 if no match). Uses stored mapping when available.
  const sourcePerChunk = useMemo(
    () => resolveSourcesPerChunk(chunks, sources),
    [chunks, sources]
  )

  const activeSentCount = (activeIndex >= 0 ? sentsPerChunk[activeIndex]?.length : 0) ?? 0
  const activeSentIdx = (activeIndex >= 0 && chunkDuration > 0 && activeSentCount > 0)
    ? Math.min(Math.floor((timeInChunk / chunkDuration) * activeSentCount), activeSentCount - 1)
    : -1

  useEffect(() => {
    if (!autoScroll || activeIndex < 0) return
    const raf = requestAnimationFrame(() => {
      const sent = document.querySelector('[data-active-sent="true"]') as HTMLElement | null
      if (!sent) return
      const rect = sent.getBoundingClientRect()
      const viewportH = window.innerHeight
      const headerH = 56
      const playerH = 110
      const tooHigh = rect.top < headerH + 40
      const tooLow = rect.bottom > viewportH - playerH - 40
      if (tooHigh || tooLow) {
        sent.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [autoScroll, activeIndex, activeSentIdx])

  return (
    <div>
      {chunks.map((chunk, i) => {
        const isActive = i === activeIndex && activeIndex >= 0
        const src = sourcePerChunk[i]
        const isLastOfSection = src >= 0 && (i === chunks.length - 1 || sourcePerChunk[i + 1] !== src)
        const source = isLastOfSection ? sources[src] : undefined

        return (
          <ChunkParagraph
            key={chunk.id}
            sents={sentsPerChunk[i] ?? []}
            isActive={isActive}
            activeSentIdx={isActive ? activeSentIdx : -1}
            sourceUrl={source ? emailLink(source) : undefined}
            sourceLabel={source ? senderName(source.sender) : undefined}
          />
        )
      })}
      <style>{`
        .md-hr { display:block; height:1px; background:rgba(0,0,0,0.08); margin:0.75em 0 }
        mark { color:inherit }
      `}</style>
    </div>
  )
}
