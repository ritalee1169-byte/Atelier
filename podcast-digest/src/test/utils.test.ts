import { describe, it, expect } from 'vitest'
import { formatDuration, formatDate, cn } from '../lib/utils'

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })
  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })
})

describe('formatDate', () => {
  it('formats a date string to Chinese locale', () => {
    expect(formatDate('2026-05-07')).toBe('5月7日')
  })
})
