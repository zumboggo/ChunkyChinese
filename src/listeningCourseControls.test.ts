import { expect, it } from 'vitest'
import { lessonNumberIndex, nextCourseLesson, wordPinyin } from './listeningCourseControls'

it('only navigates to whole lesson numbers within the published course', () => {
  expect(lessonNumberIndex('1', 15)).toBe(0)
  expect(lessonNumberIndex('15', 15)).toBe(14)
  for (const input of ['', '0', '-1', '16', '1.5', '1e1', 'hello']) expect(lessonNumberIndex(input, 15)).toBeNull()
})
it('auto-next advances in course order, obeys the toggle, and stops at the end', () => {
  const ids = ['lesson-1', 'lesson-2', 'lesson-3']
  expect(nextCourseLesson(ids, 'lesson-1', true)).toBe('lesson-2')
  expect(nextCourseLesson(ids, 'lesson-1', false)).toBeNull()
  expect(nextCourseLesson(ids, 'lesson-3', true)).toBeNull()
  expect(nextCourseLesson(ids, 'missing', true)).toBeNull()
})

it('uses the correct lesson word sense and neutral-tone endings', () => {
  expect(wordPinyin('重')).toBe('zhòng')
  expect(wordPinyin('干')).toBe('gān')
  expect(wordPinyin('箱子')).toBe('xiāng zi')
  expect(wordPinyin('勺子')).toBe('sháo zi')
  expect(wordPinyin('茶')).toBe('chá')
})
