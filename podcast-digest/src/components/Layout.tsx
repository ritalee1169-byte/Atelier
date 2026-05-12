import { Link, Outlet, useLocation } from 'react-router'
import { AudioPlayer } from './AudioPlayer'
import { AudioPlayerProvider } from '../context/AudioPlayerContext'

export function Layout() {
  const { pathname } = useLocation()
  const hasOwnPlayer = pathname === '/' || pathname.startsWith('/episode/')

  return (
    <AudioPlayerProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <header
          className="sticky top-0 z-40"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <nav className="max-w-2xl mx-auto px-6 h-14 flex items-center">
            <Link to="/" className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              每日播客
            </Link>
          </nav>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-8">
          <Outlet />
        </main>

        {!hasOwnPlayer && <AudioPlayer />}
      </div>
    </AudioPlayerProvider>
  )
}
