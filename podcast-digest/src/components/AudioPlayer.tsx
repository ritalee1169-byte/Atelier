import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { formatDuration } from '../lib/utils'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function AudioPlayer() {
  const { episode, isPlaying, currentTime, duration, speed, pause, resume, seek, skip, setSpeed } =
    useAudioPlayer()

  if (!episode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: 'rgba(247,247,245,0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* progress bar */}
      <div
        className="h-0.5 cursor-pointer"
        style={{ backgroundColor: 'var(--border)' }}
        onClick={e => {
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          seek(pct * duration)
        }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
        {/* episode info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
            {episode.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {formatDuration(Math.floor(currentTime))} / {formatDuration(episode.duration_sec)}
          </p>
        </div>

        {/* controls */}
        <div className="flex items-center gap-3">
          <button onClick={() => skip(-15)} className="p-1.5 transition-opacity hover:opacity-60">
            <SkipBack size={18} color="var(--foreground)" />
          </button>
          <button
            onClick={isPlaying ? pause : resume}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--foreground)' }}
          >
            {isPlaying
              ? <Pause size={16} fill="var(--bg)" color="var(--bg)" />
              : <Play size={16} fill="var(--bg)" color="var(--bg)" />
            }
          </button>
          <button onClick={() => skip(15)} className="p-1.5 transition-opacity hover:opacity-60">
            <SkipForward size={18} color="var(--foreground)" />
          </button>
        </div>

        {/* speed */}
        <div className="flex items-center gap-1">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                borderRadius: 'var(--radius)',
                backgroundColor: speed === s ? 'var(--foreground)' : 'transparent',
                color: speed === s ? 'var(--bg)' : 'var(--muted)',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
