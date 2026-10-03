export interface CourseProgress {
  lessonId: string
  seconds: number
  completed: string[]
  listens: Record<string, number>
  ranges: Array<[number, number]>
}

export function readCourseProgress(key: string, ids: string[], storage: Pick<Storage, 'getItem'> = localStorage): CourseProgress {
  const initial: CourseProgress = { lessonId: ids[0], seconds: 0, completed: [], listens: {}, ranges: [] }
  try {
    const data = JSON.parse(storage.getItem(key) ?? 'null')
    if (!data || !ids.includes(data.lessonId)) return initial
    const completed = Array.isArray(data.completed) ? [...new Set<string>(data.completed.filter((id: string) => ids.includes(id)))] : []
    const listens: Record<string, number> = {}
    for (const id of ids) {
      const count = data.listens?.[id]
      if (Number.isSafeInteger(count) && count >= 0) listens[id] = count
      else if (completed.includes(id)) listens[id] = 1
    }
    return {
      lessonId: data.lessonId,
      listens,
      seconds: Number.isFinite(data.seconds) ? Math.max(0, data.seconds) : 0,
      completed: Array.isArray(data.completed) ? [...new Set<string>(data.completed.filter((id: string) => ids.includes(id)))] : [],
      ranges: Array.isArray(data.ranges) ? mergeHeardRanges(data.ranges.filter((r: unknown): r is [number, number] => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite) && r[0] >= 0 && r[1] >= r[0])) : [],
    }
  } catch { return initial }
}

export function addHeardRange(ranges: Array<[number, number]>, start: number, end: number): Array<[number, number]> {
  // A large jump is a seek or suspended callback, not proof of listening.
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end - start > 2) return ranges
  return mergeHeardRanges([...ranges, [start, end]])
}

/** Native audio.played ranges also work when background timers are suspended. */
export function mergeHeardRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const sorted = ranges.map(([a, b]): [number, number] => [a, b]).sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1] + 0.05) last[1] = Math.max(last[1], range[1])
    else merged.push(range)
  }
  return merged
}

export function heardSeconds(ranges: Array<[number, number]>, duration: number): number {
  return ranges.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, duration) - a), 0)
}

export function completeCourseListen(progress: CourseProgress, lessonId: string): CourseProgress {
  return {
    ...progress,
    completed: [...new Set([...progress.completed, lessonId])],
    listens: { ...progress.listens, [lessonId]: (progress.listens[lessonId] ?? 0) + 1 },
    ...(progress.lessonId === lessonId ? { seconds: 0, ranges: [] } : {}),
  }
}
