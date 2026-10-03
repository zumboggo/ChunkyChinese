export const courseThemes = [
  { id: 'everyday', label: 'Everyday life' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'school', label: 'School' },
  { id: 'taxi', label: 'Taxis & getting around' },
  { id: 'lms', label: 'LMS · Legendary Moonlight Sculptor' },
] as const

export interface ThemedLesson { id: string; theme: string }

export function lessonsInTheme<T extends ThemedLesson>(lessons: T[], theme: string): T[] {
  return theme === 'all' ? lessons : lessons.filter(lesson => lesson.theme === theme)
}

/** Course order breaks ties, including lessons with no recorded listens. */
export function leastPlayedLesson<T extends ThemedLesson>(lessons: T[], listens: Record<string, number>): T | undefined {
  return lessons.reduce<T | undefined>((best, lesson) =>
    !best || (listens[lesson.id] ?? 0) < (listens[best.id] ?? 0) ? lesson : best, undefined)
}
