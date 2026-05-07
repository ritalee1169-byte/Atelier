import { describe, it, expect } from 'vitest'
import { generateRssXml } from '../lib/rss'
import type { Episode } from '../types'

const mockEpisodes: Episode[] = [
  {
    id: 'abc123',
    date: '2026-05-06',
    title: '5月6日科技早报',
    summary_text: '今天有很多有趣的新闻...',
    audio_url: 'https://example.com/podcasts/2026-05-06.mp3',
    duration_sec: 720,
    source_count: 5,
    created_at: '2026-05-06T22:01:00Z',
  },
]

describe('generateRssXml', () => {
  it('returns valid RSS 2.0 XML string', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
  })

  it('includes enclosure with audio URL', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('https://example.com/podcasts/2026-05-06.mp3')
    expect(xml).toContain('audio/mpeg')
  })

  it('includes episode title', () => {
    const xml = generateRssXml(mockEpisodes)
    expect(xml).toContain('5月6日科技早报')
  })
})
