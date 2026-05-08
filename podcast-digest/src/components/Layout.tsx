import { Link, Outlet, useLocation } from 'react-router'
import { AudioPlayer } from './AudioPlayer'
import { AudioPlayerProvider } from '../context/AudioPlayerContext'

const navLinks = [
  { path: '/', label: '今日' },
  { path: '/archive', label: '存档' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <AudioPlayerProvider>
      <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
        <header
          className="sticky top-0 z-40"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <nav className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link to="/" className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              每日播客
            </Link>
            <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--card)' }}>
              {navLinks.map(link => {
                const active = pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="px-4 py-1.5 text-sm rounded-lg transition-all"
                    style={{
                      backgroundColor: active ? '#fff' : 'transparent',
                      color: active ? 'var(--foreground)' : 'var(--muted)',
                      fontWeight: active ? 500 : 400,
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-8">
          <Outlet />
        </main>

        {pathname !== '/' && <AudioPlayer />}
      </div>
    </AudioPlayerProvider>
  )
}
