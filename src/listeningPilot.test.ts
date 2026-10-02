import { describe, expect, it } from 'vitest'
import pilot from './content/listening-pilot.json'
import { compilePilotLesson, measurePilot, undeclaredCharacters, type PilotLesson } from './listeningPilot'

const lessons = pilot as PilotLesson[]

describe('listening lesson pilot', () => {
  it('keeps every sentence within its declared focus and prerequisites', () => {
    for (const lesson of lessons) {
      expect(undeclaredCharacters(lesson), lesson.title).toEqual([])
      expect(lesson.focus.length).toBeGreaterThanOrEqual(4)
      expect(lesson.focus.length).toBeLessThanOrEqual(5)
    }
  })

  it('makes the final exchange Chinese-first and does not emit progress ratings', () => {
    for (const lesson of lessons) {
      const steps = compilePilotLesson(lesson)
      expect(new Set(steps.map(step => step.id)).size).toBe(steps.length)
      const conversation = steps.filter(step => step.phase === 'conversation' && step.kind === 'speech')
      expect(conversation.slice(1, 1 + lesson.dialogue.length).map(step => step.text))
        .toEqual(lesson.dialogue.map(line => line.zh))
      expect(conversation.slice(1, 1 + lesson.dialogue.length).every(step => step.language === 'zh')).toBe(true)
      expect(steps.every(step => step.kind === 'speech' || step.kind === 'pause')).toBe(true)
    }
  })

  it('never approves timing when a clip is missing or invalid', () => {
    const steps = compilePilotLesson(lessons[0])
    const incomplete = measurePilot(steps, {})
    expect(incomplete.withinTarget).toBe(false)
    expect(incomplete.missing.length).toBeGreaterThan(0)
    const firstSpeech = steps.find(step => step.kind === 'speech')!
    expect(measurePilot([firstSpeech], { [firstSpeech.id]: Number.NaN }).missing).toEqual([firstSpeech.id])
    expect(measurePilot([firstSpeech], { [firstSpeech.id]: 0 }).missing).toEqual([firstSpeech.id])
  })

  it('accepts measured durations only inside the inclusive 30-second tolerance', () => {
    const step = { id: 'a', phase: 'build', kind: 'speech' } as const
    for (const seconds of [210, 240, 270]) expect(measurePilot([step], { a: seconds }).withinTarget).toBe(true)
    for (const seconds of [209.9, 270.1]) expect(measurePilot([step], { a: seconds }).withinTarget).toBe(false)
  })

  it('flags an undeclared word instead of quietly treating it as known', () => {
    const lesson = { ...lessons[0], opening: { zh: '鳄鱼', en: 'crocodile' } }
    expect(undeclaredCharacters(lesson)).toEqual(['鳄', '鱼'])
  })
})
