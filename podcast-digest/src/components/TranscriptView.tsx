import { useEffect, useRef } from 'react'
import type { EpisodeChunk } from '../types'

interface TranscriptViewProps {
  chunks: EpisodeChunk[]
  currentTime: number
  duration: number
}

// Determine active chunk by evenly distributing playback time across chunks.
function getActiveChunkIndex(currentTime: number, duration: number, total: number): number {
  if (duration === 0 || total === 0) return 0
  return Math.min(Math.floor((currentTime / duration) * total), total - 1)
}

export function TranscriptView({ chunks, currentTime, duration }: TranscriptViewProps) {
  const activeIndex = getActiveChunkIndex(currentTime, duration, chunks.length)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="space-y-4">
      {chunks.map((chunk, i) => {
        const isActive = i === activeIndex
        return (
          <div
            key={chunk.id}
            ref={isActive ? activeRef : undefined}
            className="px-4 py-3 rounded-md transition-all duration-300"
            style={{
              borderRadius: 'var(--radius)',
              backgroundColor: isActive ? '#e8f0fe' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
            }}
          >
            <p
              className="text-base leading-8"
              style={{
                color: isActive ? 'var(--foreground)' : 'var(--muted)',
                transition: 'color 0.3s',
              }}
            >
              {chunk.content}
            </p>
          </div>
        )
      })}
    </div>
  )
}
