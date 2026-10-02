/** Content-first pilot. Playback is exposure, never an automatic recall rating. */
export interface PilotPhrase { zh: string; en: string }
export interface PilotFocus extends PilotPhrase { sourceConcept: string | null }
export interface PilotLesson {
  id: string
  title: string
  objective: string
  prerequisites: string[]
  focus: PilotFocus[]
  opening: PilotPhrase
  ladder: PilotPhrase[]
  transfers: Array<PilotPhrase & { question: string; answer: string }>
  dialogue: Array<PilotPhrase & { speaker: 'a' | 'b' }>
  dialogueQuestion: string
  dialogueAnswer: string
  closing: PilotPhrase[]
}
export interface PilotStep {
  id: string
  phase: 'reconnect' | 'introduce' | 'build' | 'transfer' | 'conversation' | 'finish'
  kind: 'speech' | 'pause'
  text?: string
  language?: 'en' | 'zh'
  speaker?: 'narrator' | 'a' | 'b'
  seconds?: number
}

export const PILOT_DURATION = { min: 210, target: 240, max: 270 } as const

/** Explicit context comprehension, rather than automatic promotion from playback. */
export function compilePilotLesson(lesson: PilotLesson): PilotStep[] {
  const steps: PilotStep[] = []
  let phase: PilotStep['phase'] = 'reconnect'
  const speak = (text: string, language: 'en' | 'zh' = 'en', speaker: PilotStep['speaker'] = 'narrator') => {
    steps.push({ id: `${lesson.id}-${steps.length + 1}`, phase, kind: 'speech', text, language, speaker })
    // Keep edits and language switches from running into the next utterance.
    steps.push({ id: `${lesson.id}-${steps.length + 1}`, phase, kind: 'pause', seconds: 0.35 })
  }
  const pause = (seconds: number) => steps.push({ id: `${lesson.id}-${steps.length + 1}`, phase, kind: 'pause', seconds })
  speak(lesson.objective)
  speak('First, listen. What does this mean?')
  speak(lesson.opening.zh, 'zh', 'a'); pause(3); speak(lesson.opening.en)
  phase = 'introduce'
  speak('Here are the pieces. Notice the sound, then the meaning.')
  for (const focus of lesson.focus) {
    speak(focus.zh, 'zh', 'a'); speak(focus.en); speak(focus.zh, 'zh', 'a'); pause(1.5)
  }
  phase = 'build'
  speak('Now put the pieces together. You can answer aloud, or just think the answer.')
  for (const [index, phrase] of lesson.ladder.entries()) {
    speak(phrase.zh, 'zh', 'a'); pause(2); speak(phrase.en)
    if (index % 2 === 0) {
      speak('Try saying it in Chinese.'); pause(4)
    } else {
      speak('Listen again. Notice what changed.')
    }
    speak(phrase.zh, 'zh', 'a'); pause(1.5)
  }
  speak('Bring back three of the pieces. Try to remember before you hear the answer.')
  for (const focus of lesson.focus.slice(0, 3)) {
    speak(focus.en); pause(3); speak(focus.zh, 'zh', 'a')
  }
  phase = 'transfer'
  speak('Listen for the message. The details will change.')
  for (const phrase of lesson.transfers) {
    speak(phrase.zh, 'zh', 'b'); speak(phrase.question); pause(3)
    speak(phrase.answer); speak(phrase.zh, 'zh', 'b'); pause(1)
  }
  phase = 'conversation'
  speak('Now listen to the whole exchange. There is no translation first.')
  for (const phrase of lesson.dialogue) { speak(phrase.zh, 'zh', phrase.speaker); pause(0.6) }
  speak(lesson.dialogueQuestion); pause(4); speak(lesson.dialogueAnswer)
  speak('Listen once more, with the situation in mind.')
  for (const phrase of lesson.dialogue) { speak(phrase.zh, 'zh', phrase.speaker); pause(0.6) }
  phase = 'finish'
  speak('Two last phrases. See what comes back.')
  for (const phrase of lesson.closing) { speak(phrase.en); pause(4); speak(phrase.zh, 'zh', 'a') }
  speak('That is the end of this lesson.')
  return steps
}

/** Only measured clip durations qualify a recording for the 3:30–4:30 window. */
export function measurePilot(steps: PilotStep[], clipSeconds: Record<string, number>) {
  const missing: string[] = []
  let seconds = 0
  for (const step of steps) {
    const duration = step.kind === 'pause' ? step.seconds : clipSeconds[step.id]
    if (duration === undefined || !Number.isFinite(duration) || duration < 0 || (step.kind === 'speech' && duration === 0)) {
      missing.push(step.id)
    } else seconds += duration
  }
  return {
    seconds,
    missing,
    withinTarget: missing.length === 0 && seconds >= PILOT_DURATION.min && seconds <= PILOT_DURATION.max,
  }
}

/** Fail closed if authoring introduces vocabulary outside the declared inventory. */
export function undeclaredCharacters(lesson: PilotLesson): string[] {
  const vocabulary = [...lesson.prerequisites, ...lesson.focus.map(word => word.zh)]
    .filter(Boolean).sort((a, b) => b.length - a.length)
  const phrases = [lesson.opening, ...lesson.ladder, ...lesson.transfers, ...lesson.dialogue, ...lesson.closing]
  const unknown = new Set<string>()
  for (const { zh } of phrases) {
    let remaining = zh.replace(/[^\p{Script=Han}]/gu, '')
    while (remaining) {
      const match = vocabulary.find(word => remaining.startsWith(word))
      if (match) remaining = remaining.slice(match.length)
      else { unknown.add(remaining[0]); remaining = remaining.slice(1) }
    }
  }
  return [...unknown]
}
