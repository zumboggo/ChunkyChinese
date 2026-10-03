import { expect, it } from 'vitest'
import { lessonsInTheme, leastPlayedLesson, courseThemes } from './listeningCourseThemes'
import { nextCourseLesson } from './listeningCourseControls'
import pilot from './content/listening-pilot.json'
import additional from './content/listening-additional.json'
const lessons = [...pilot, ...additional]

it('selects unplayed lessons first and breaks ties in course order', () => {
  const deliveries = lessonsInTheme(lessons, 'deliveries')
  expect(leastPlayedLesson(deliveries, {})?.id).toBe('listening-011')
  expect(leastPlayedLesson(deliveries, { 'listening-011': 2, 'listening-012': 1 })?.id).toBe('listening-013')
  expect(leastPlayedLesson(deliveries, { 'listening-011': 5, 'listening-012': 3, 'listening-013': 4, 'listening-015': 3 })?.id).toBe('listening-012')
  expect(leastPlayedLesson([], {})).toBeUndefined()
})
it('keeps themed navigation in the theme even across gaps in lesson numbers', () => {
  const ids = lessonsInTheme(lessons, 'deliveries').map(item => item.id)
  expect(nextCourseLesson(ids, 'listening-013', true)).toBe('listening-015')
  expect(nextCourseLesson(ids, 'listening-015', true)).toBeNull()
  expect(lessonsInTheme(lessons, 'all')).toHaveLength(30)
  expect(lessons.every(lesson => courseThemes.some(theme => theme.id === lesson.theme))).toBe(true)
})

it('makes the ten LMS lessons available in course order', () => {
  const lms = lessonsInTheme(lessons, 'lms')
  expect(lms).toHaveLength(10)
  expect(leastPlayedLesson(lms, {})?.id).toBe('listening-021')
  expect(leastPlayedLesson(lms, { 'listening-021': 1 })?.id).toBe('listening-022')
  expect(lms.at(-1)?.id).toBe('listening-030')
})
