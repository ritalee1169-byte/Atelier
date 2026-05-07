import { Link, Outlet, useLocation } from 'react-router'
import { AudioPlayer } from './AudioPlayer'

const navLinks = [
  { path: '/', label: '今日' },
  { path: '/archive', label: '存档' },
  { path: '/notes', label: '笔记本' },
  { path: '/ask', label: '提问' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgba(247,247,245,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)',
        }}
      >
        <nav className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            每日播客
          </Link>
          <div className="flex items-center gap-1">
            {navLinks.map(link => {
              const active = pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3 py-1.5 text-sm rounded-md transition-colors"
                  style={{
                    borderRadius: 'var(--radius)',
                    backgroundColor: active ? 'var(--card)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--muted)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      <AudioPlayer />
    </div>
  )
}
