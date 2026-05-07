// Splits text into chunks by paragraph, targeting maxWords per chunk.
// Used to create episode_chunks for pgvector storage.
export function chunkText(text: string, maxWords: number): string[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  const chunks: string[] = []
  let current = ''
  let wordCount = 0

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length
    if (wordCount + words > maxWords && current) {
      chunks.push(current.trim())
      current = para
      wordCount = words
    } else {
      current = current ? `${current}\n\n${para}` : para
      wordCount += words
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}
