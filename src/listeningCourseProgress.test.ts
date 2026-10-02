import { describe, expect, it } from 'vitest'
import { addHeardRange, heardSeconds, mergeHeardRanges, readCourseProgress } from './listeningCourseProgress'

describe('listening course progress', () => {
  it('counts overlapping replays only once', () => {
    const ranges = mergeHeardRanges([[0, 50], [40, 90], [10, 30]])
    expect(ranges).toEqual([[0, 90]])
    expect(heardSeconds(ranges, 240)).toBe(90)
  })
  it('does not turn a seek into listening credit', () => {
    expect(addHeardRange([[0, 10]], 10, 239)).toEqual([[0, 10]])
    expect(heardSeconds(mergeHeardRanges([[0, 10], [238, 240]]), 240)).toBe(12)
  })
  it('supports long native played ranges after background timer suspension', () => {
    expect(heardSeconds(mergeHeardRanges([[0, 30], [25, 240]]), 240)).toBe(240)
  })
  it('safely recovers from invalid persisted state and filters obsolete lessons', () => {
    expect(readCourseProgress('key', ['one'], { getItem: () => '{bad' }).lessonId).toBe('one')
    const state = readCourseProgress('key', ['one'], { getItem: () => JSON.stringify({ lessonId: 'one', seconds: -5, completed: ['one', 'one', 'removed'], ranges: [[0, 10], [5, 20], [-1, 5], [5, 2]] }) })
    expect(state).toEqual({ lessonId: 'one', seconds: 0, completed: ['one'], ranges: [[0, 20]] })
  })
})
