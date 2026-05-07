import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { formatDate, formatDuration } from '../lib/utils'
import type { Episode } from '../types'

export function Archive() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('episodes')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setEpisodes(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
        历史存档
      </h1>
      <div className="space-y-3">
        {episodes.map(ep => (
          <Link
            key={ep.id}
            to={`/episode/${ep.id}`}
            className="flex items-center justify-between p-4 border rounded-md transition-all hover:shadow-md"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                {formatDate(ep.date)} · {ep.source_count} 封订阅
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {ep.title}
              </p>
            </div>
            <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--muted)' }}>
              {formatDuration(ep.duration_sec)}
            </span>
          </Link>
        ))}
        {episodes.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: 'var(--muted)' }}>
            还没有历史记录
          </p>
        )}
      </div>
    </div>
  )
}
