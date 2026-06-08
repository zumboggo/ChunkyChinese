import type { MutableRefObject } from 'react'
import type { ReaderSentence, ReaderWordToken } from '../types'
import type { VisualNovelWorldSave, VnLocation, VnNode, VnText } from './types'

export function getNodeText(node: VnNode): VnText | undefined {
  if (node.type === 'line') return node.text
  if (node.type === 'choice') return node.prompt
  if (node.type === 'cinematic') return node.caption
  if (node.type === 'questResult') return node.summary
  if (node.type === 'cardBattle') return undefined
  return node.summary
}

export function getNodeAudioClipId(
  node: VnNode,
  readerSentenceById: Map<string, ReaderSentence>,
): string | undefined {
  if ((node.type === 'line' || node.type === 'cinematic') && node.audioClipId) return node.audioClipId
  const readerSentenceId = getNodeText(node)?.readerSentenceId
  return readerSentenceId ? readerSentenceById.get(readerSentenceId)?.audioClipId : undefined
}

export function scopedTokens(tokens: ReaderWordToken[], prefix: string): ReaderWordToken[] {
  return tokens.map((token) => ({ ...token, id: `${prefix}-${token.id}` }))
}

export function stopAudio(
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  tokenRef: MutableRefObject<number>,
  nextToken = tokenRef.current + 1,
) {
  tokenRef.current = nextToken
  audioRef.current?.pause()
  audioRef.current = null
  window.speechSynthesis?.cancel()
}

export function speakUtterance(text: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.lang = /[\u3400-\u9fff]/u.test(text) ? 'zh-CN' : 'en-US'
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

export function formatDueDate(value?: string): string {
  if (!value) return 'Unscheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function getLocationBackgroundId(location: VnLocation | undefined, save: VisualNovelWorldSave | null): string | undefined {
  if (!location) return undefined
  if (location.restoredBackgroundId && save?.state.flags[`${location.id}-restored`] === true) {
    return location.restoredBackgroundId
  }
  return location.backgroundId
}

export function getLocationDescription(location: VnLocation | undefined, save: VisualNovelWorldSave): VnText | undefined {
  if (!location) return undefined
  if (location.restoredDescription && save.state.flags[`${location.id}-restored`] === true) {
    return location.restoredDescription
  }
  return location.description
}

export const VN_DEFAULT_ENCOUNTER_DECK = [
  'strike', 'strike', 'strike', 'strike',
  'defend', 'defend', 'defend',
  'bash',
]
export const VN_DEFAULT_ENEMY_MAX_HP = 24
export const VN_DEFAULT_PLAYER_MAX_HP = 50
