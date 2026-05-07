import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { NoteCard } from '../components/NoteCard'
import type { Note, Episode } from '../types'
import { Search } from 'lucide-react'

export function Notes() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('episodes').select('id, date, title, summary_text, audio_url, duration_sec, source_count, created_at'),
    ]).then(([{ data: ns }, { data: eps }]) => {
      setNotes(ns ?? [])
      setEpisodes((eps as Episode[]) ?? [])
      setLoading(false)
    })
  }, [])

  const episodeDateMap = useMemo(
    () => Object.fromEntries(episodes.map(e => [e.id, e.date])),
    [episodes]
  )

  const allTags = useMemo(
    () => [...new Set(notes.flatMap(n => n.tags))].sort(),
    [notes]
  )

  const filtered = useMemo(
    () =>
      notes.filter(n => {
        const matchSearch =
          !search ||
          n.question.toLowerCase().includes(search.toLowerCase()) ||
          n.answer.toLowerCase().includes(search.toLowerCase())
        const matchTag = !activeTag || n.tags.includes(activeTag)
        return matchSearch && matchTag
      }),
    [notes, search, activeTag]
  )

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
        笔记本
      </h1>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--muted)" />
        <input
          type="text"
          placeholder="搜索笔记..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-md outline-none"
          style={{
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="text-xs px-3 py-1 transition-colors"
              style={{
                borderRadius: '999px',
                backgroundColor: activeTag === tag ? 'var(--foreground)' : 'var(--card)',
                color: activeTag === tag ? 'var(--bg)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            episodeDateMap={episodeDateMap}
            onContinue={q => navigate(`/ask?q=${encodeURIComponent(q)}`)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: 'var(--muted)' }}>
            {search || activeTag ? '没有匹配的笔记' : '还没有笔记，去提问试试'}
          </p>
        )}
      </div>
    </div>
  )
}
