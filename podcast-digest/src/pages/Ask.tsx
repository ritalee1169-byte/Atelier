import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowRight, BookmarkPlus, Loader2 } from 'lucide-react'

interface AskResult {
  answer: string
  noteId?: string
  episodeIds: string[]
}

export function Ask() {
  const [searchParams] = useSearchParams()
  const [question, setQuestion] = useState(searchParams.get('q') ?? '')
  const [result, setResult] = useState<AskResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) submit(q)
  }, [])

  async function submit(q = question) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
    setSaved(false)

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, saveNote: false }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  async function saveNote() {
    if (!result) return
    await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, saveNote: true }),
    })
    setSaved(true)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--foreground)' }}>
        提问
      </h1>

      <form
        onSubmit={e => { e.preventDefault(); submit() }}
        className="flex gap-2 mb-8"
      >
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="问任何关于订阅内容的问题..."
          className="flex-1 px-4 py-3 text-sm border rounded-md outline-none"
          style={{
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)',
          }}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 rounded-md transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--bg)',
            borderRadius: 'var(--radius)',
          }}
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <ArrowRight size={16} />
          }
        </button>
      </form>

      {result && (
        <div
          className="p-5 border rounded-md mb-4"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-card)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>
            {question}
          </p>
          <p className="text-sm leading-7 mb-4" style={{ color: 'var(--foreground)' }}>
            {result.answer}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {result.episodeIds.map(eid => (
                <span
                  key={eid}
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: '#eff6ff',
                    color: 'var(--accent)',
                    borderRadius: '999px',
                  }}
                >
                  来源
                </span>
              ))}
            </div>
            {!saved ? (
              <button
                onClick={saveNote}
                className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <BookmarkPlus size={14} />
                保存为笔记
              </button>
            ) : (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>✓ 已保存</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
