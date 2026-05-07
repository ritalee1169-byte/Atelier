import { describe, it, expect } from 'vitest'
import { chunkText } from '../lib/chunker'

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const text = 'Hello world.'
    expect(chunkText(text, 100)).toEqual(['Hello world.'])
  })

  it('splits on paragraph boundaries', () => {
    const text = 'Para one.\n\nPara two.\n\nPara three.'
    const chunks = chunkText(text, 5)  // 5 words per chunk
    expect(chunks.length).toBeGreaterThan(1)
    // each chunk content is non-empty
    chunks.forEach(c => expect(c.trim().length).toBeGreaterThan(0))
  })

  it('does not produce empty chunks', () => {
    const text = 'A.\n\n\n\nB.'
    const chunks = chunkText(text, 100)
    expect(chunks.every(c => c.trim().length > 0)).toBe(true)
  })
})
