import { pinyin } from 'pinyin-pro'

// Use the spoken word sense and common neutral-tone endings for these lessons.
const pronunciation: Record<string, string> = {
  '例子': 'lì zi', '孩子': 'hái zi', '清楚': 'qīng chu',
  '爱思瑟': 'ài sī sè', '华润二十四城': 'huá rùn èr shí sì chéng',
  '勺子': 'sháo zi', '鞋子': 'xié zi', '箱子': 'xiāng zi',
  '名字': 'míng zi', '舒服': 'shū fu', '窗户': 'chuāng hu',
  '哪个': 'nǎ ge', '听清楚': 'tīng qīng chu', '重': 'zhòng', '干': 'gān',
}
export const wordPinyin = (word: string): string => pronunciation[word] ?? pinyin(word)

export function lessonNumberIndex(value: string, count: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && number <= count ? number - 1 : null
}

export function nextCourseLesson(ids: string[], current: string, autoNext: boolean): string | null {
  const index = ids.indexOf(current)
  return autoNext && index >= 0 ? ids[index + 1] ?? null : null
}
