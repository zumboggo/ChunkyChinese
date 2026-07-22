import { describe, expect, it } from 'vitest'
import { isCredibleSpeechCompletion, nextReaderListeningCompletion, readerShadowPauseMs } from './readerListening'

describe('reader listening completion', () => {
  it('repeats until the configured count is reached', () => {
    expect(nextReaderListeningCompletion({
      mode: 'continuous',
      repeatNumber: 1,
      repeatCount: 3,
      autoAdvance: true,
      hasNextSentence: true,
    })).toEqual({ kind: 'repeat', repeatNumber: 2 })
  })

  it('advances after the final repetition when enabled', () => {
    expect(nextReaderListeningCompletion({
      mode: 'continuous',
      repeatNumber: 3,
      repeatCount: 3,
      autoAdvance: true,
      hasNextSentence: true,
    })).toEqual({ kind: 'advance', repeatNumber: 1 })
  })

  it('completes when automatic advance is disabled or the book is finished', () => {
    expect(nextReaderListeningCompletion({
      mode: 'continuous',
      repeatNumber: 2,
      repeatCount: 2,
      autoAdvance: false,
      hasNextSentence: true,
    }).kind).toBe('complete')
    expect(nextReaderListeningCompletion({
      mode: 'continuous',
      repeatNumber: 2,
      repeatCount: 2,
      autoAdvance: true,
      hasNextSentence: false,
    }).kind).toBe('complete')
  })

  it('single-sentence playback never repeats or advances', () => {
    expect(nextReaderListeningCompletion({
      mode: 'single',
      repeatNumber: 1,
      repeatCount: 5,
      autoAdvance: true,
      hasNextSentence: true,
    }).kind).toBe('complete')
  })

  it('rejects instant speech-synthesis completions that indicate unavailable TTS', () => {
    expect(isCredibleSpeechCompletion(1000, 1100)).toBe(false)
    expect(isCredibleSpeechCompletion(1000, 1400)).toBe(true)
  })

  it('uses the spoken sentence duration for the shadowing pause', () => {
    expect(readerShadowPauseMs(2400, 1)).toBe(2400)
    expect(readerShadowPauseMs(2400, 1.5)).toBe(3600)
    expect(readerShadowPauseMs(2400, 0)).toBe(0)
  })
})
