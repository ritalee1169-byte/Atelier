import {
  createContext, useContext, useEffect, useCallback,
  useSyncExternalStore, type ReactNode,
} from 'react'
import type { Episode } from '../types'

// ── module-level store (lives outside React's fiber tree) ──────────────────

interface AudioState {
  episode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: number
}

let cur: AudioState = { episode: null, isPlaying: false, currentTime: 0, duration: 0, speed: 1 }
let snap = cur
const subs = new Set<() => void>()

function set(u: Partial<AudioState>) {
  cur = { ...cur, ...u }
  snap = cur
  subs.forEach(fn => fn())
}

const externalStore = {
  subscribe: (fn: () => void) => { subs.add(fn); return () => subs.delete(fn) },
  getSnapshot: () => snap,
}

// ── module-level audio element ─────────────────────────────────────────────

let audio: HTMLAudioElement | null = null

function ensureAudio() {
  if (audio) return
  audio = new Audio()
  audio.addEventListener('timeupdate', () => set({ currentTime: audio!.currentTime }))
  audio.addEventListener('durationchange', () => set({ duration: audio!.duration }))
  audio.addEventListener('ended', () => set({ isPlaying: false }))
}

// ── provider (just ensures audio is initialised) ───────────────────────────

const Ctx = createContext(false)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureAudio()
    return () => {
      audio?.pause()
      audio = null
    }
  }, [])
  return <Ctx.Provider value={true}>{children}</Ctx.Provider>
}

// ── hook ───────────────────────────────────────────────────────────────────

export function useAudioPlayer() {
  const inProvider = useContext(Ctx)
  if (!inProvider) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider')

  const state = useSyncExternalStore(externalStore.subscribe, externalStore.getSnapshot)

  const play = useCallback((ep: Episode) => {
    ensureAudio()
    audio!.src = ep.audio_url
    audio!.playbackRate = snap.speed
    audio!.play().catch(() => {})
    set({ episode: ep, isPlaying: true, currentTime: 0, duration: 0 })
  }, [])

  const pause = useCallback(() => {
    audio?.pause()
    set({ isPlaying: false })
  }, [])

  const resume = useCallback(() => {
    audio?.play().catch(() => {})
    set({ isPlaying: true })
  }, [])

  const seek = useCallback((seconds: number) => {
    if (!audio) return
    audio.currentTime = seconds
    set({ currentTime: seconds })
  }, [])

  const skip = useCallback((seconds: number) => {
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime + seconds)
  }, [])

  const setSpeed = useCallback((s: number) => {
    if (audio) audio.playbackRate = s
    set({ speed: s })
  }, [])

  return { ...state, play, pause, resume, seek, skip, setSpeed }
}
