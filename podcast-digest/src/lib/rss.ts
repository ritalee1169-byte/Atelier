/// <reference types="node" />
import type { Episode } from '../types'

export function generateRssXml(episodes: Episode[]): string {
  const items = episodes.map(ep => `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.summary_text.slice(0, 300)}...]]></description>
      <pubDate>${new Date(ep.created_at).toUTCString()}</pubDate>
      <guid isPermaLink="false">${ep.id}</guid>
      <enclosure
        url="${ep.audio_url}"
        type="audio/mpeg"
        length="0"
      />
      ${ep.duration_sec ? `<itunes:duration>${ep.duration_sec}</itunes:duration>` : ''}
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>每日知识播客</title>
    <link>${process.env.VITE_APP_URL ?? 'https://localhost:5173'}</link>
    <description>每天自动整合邮件订阅内容，生成播客</description>
    <language>zh-cn</language>
    ${items}
  </channel>
</rss>`
}
