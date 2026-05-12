// Per-chunk source mapping:
//   1. If chunks already carry source_email_idx (new episodes), use it directly.
//   2. Otherwise fall back to subject-keyword heuristic (old episodes).

export interface SourceEmail {
  sender: string
  subject: string
  gmail_message_id?: string | null
}

interface ChunkInput {
  content: string
  source_email_idx?: number | null
}

function meaningfulWords(subject: string): string[] {
  return subject
    .replace(/[\s，、,：:。.！!?？\-_/()（）【】\[\]"'""''`]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !/^\d+$/.test(w))
}

function heuristicMatch(chunks: ChunkInput[], sources: SourceEmail[]): number[] {
  if (sources.length === 0) return chunks.map(() => -1)
  const keywords = sources.map(s => meaningfulWords(s.subject))
  return chunks.map(c => {
    let bestIdx = -1
    let bestScore = 0
    for (let i = 0; i < sources.length; i++) {
      let score = 0
      for (const w of keywords[i]) if (c.content.includes(w)) score++
      if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    return bestScore > 0 ? bestIdx : -1
  })
}

export function resolveSourcesPerChunk(chunks: ChunkInput[], sources: SourceEmail[]): number[] {
  // Use stored mapping when any chunk has it
  const hasStored = chunks.some(c => c.source_email_idx !== null && c.source_email_idx !== undefined)
  if (hasStored) {
    return chunks.map(c =>
      c.source_email_idx !== null && c.source_email_idx !== undefined && c.source_email_idx >= 0
        ? c.source_email_idx
        : -1
    )
  }
  return heuristicMatch(chunks, sources)
}

export function senderName(raw: string): string {
  const m = raw.match(/^(.+?)\s*</)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : raw.split('@')[0]
}

function senderEmailAddr(raw: string): string {
  const m = raw.match(/<(.+?)>/)
  return m ? m[1] : raw
}

export function emailLink(source: SourceEmail): string {
  // Direct link to the message when we have the Gmail message id
  if (source.gmail_message_id) {
    return `https://mail.google.com/mail/u/0/#all/${source.gmail_message_id}`
  }
  // Otherwise open a Gmail search for that email
  return `https://mail.google.com/mail/#search/from:(${encodeURIComponent(senderEmailAddr(source.sender))})+subject:(${encodeURIComponent(source.subject)})`
}
