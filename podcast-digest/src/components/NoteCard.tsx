import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Note } from '../types'
import { formatDate } from '../lib/utils'

interface NoteCardProps {
  note: Note
  episodeDateMap: Record<string, string>  // episodeId → date string
  onContinue?: (question: string) => void
}

export function NoteCard({ note, episodeDateMap, onContinue }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const answerPreview = note.answer.slice(0, 120) + (note.answer.length > 120 ? '...' : '')

  return (
    <div
      className="p-4 border rounded-md"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      {/* question */}
      <p className="font-semibold text-sm mb-2" style={{ color: 'var(--foreground)' }}>
        {note.question}
      </p>

      {/* answer (collapsed/expanded) */}
      <p className="text-sm leading-7 mb-3" style={{ color: 'var(--muted)' }}>
        {expanded ? note.answer : answerPreview}
      </p>

      {/* footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* source badges */}
          {note.episode_ids.map(eid => {
            const date = episodeDateMap[eid]
            if (!date) return null
            return (
              <Link
                key={eid}
                to={`/episode/${eid}`}
                className="text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: '#eff6ff',
                  color: 'var(--accent)',
                  borderRadius: '999px',
                }}
              >
                {formatDate(date)}
              </Link>
            )
          })}
          {/* tags */}
          {note.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--muted)',
                borderRadius: '999px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onContinue && (
            <button
              onClick={() => onContinue(note.question)}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              继续追问
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 transition-opacity hover:opacity-60"
          >
            {expanded
              ? <ChevronUp size={14} color="var(--muted)" />
              : <ChevronDown size={14} color="var(--muted)" />}
          </button>
        </div>
      </div>
    </div>
  )
}
