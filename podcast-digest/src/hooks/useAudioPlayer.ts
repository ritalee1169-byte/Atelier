import { useState, useCallback, useEffect } from 'react'
import type { Episode } from '../types'

interface AudioPlayerState {
  episode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: number
  play: (episode: Episode) => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  skip: (seconds: number) => void
  setSpeed: (speed: number) => void
}

// Module-level ref so state is shared across all components
let audioRef: HTMLAudioElement | null = null

export function useAudioPlayer(): AudioPlayerState {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeedState] = useState(1)

  useEffect(() => {
    if (!audioRef) {
      audioRef = new Audio()
    }
    const audio = audioRef

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const play = useCallback((ep: Episode) => {
    if (!audioRef) return
    audioRef.src = ep.audio_url
    audioRef.playbackRate = speed
    audioRef.play()
    setEpisode(ep)
    setIsPlaying(true)
  }, [speed])

  const pause = useCallback(() => {
    audioRef?.pause()
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    audioRef?.play()
    setIsPlaying(true)
  }, [])

  const seek = useCallback((seconds: number) => {
    if (!audioRef) return
    audioRef.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const skip = useCallback((seconds: number) => {
    if (!audioRef) return
    audioRef.currentTime = Math.max(0, audioRef.currentTime + seconds)
  }, [])

  const setSpeed = useCallback((s: number) => {
    if (audioRef) audioRef.playbackRate = s
    setSpeedState(s)
  }, [])

  return { episode, isPlaying, currentTime, duration, speed, play, pause, resume, seek, skip, setSpeed }
}
