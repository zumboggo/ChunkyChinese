import { fsrsQueueLabel } from './scheduler'
import type { DictionaryEntry, ReaderWordToken, VocabWord } from './types'

interface WordInfoPopoverProps {
  selectedToken: ReaderWordToken
  dictionaryEntry: DictionaryEntry | null
  onClose: () => void
  onEditWord: (word: VocabWord) => void
  onSaveWord: (text: string, pinyin: string, meaning: string) => void | Promise<void>
  formatDueDate: (value?: string) => string
  minimal?: boolean
}

export function WordInfoPopover({
  selectedToken,
  dictionaryEntry,
  onClose,
  onEditWord,
  onSaveWord,
  formatDueDate,
  minimal = false,
}: WordInfoPopoverProps) {
  if (minimal) {
    if (!selectedToken.word && !selectedToken.isChinese) return null

    const pinyin = selectedToken.word?.pinyin ?? dictionaryEntry?.pinyin ?? selectedToken.pinyin
    const definition =
      selectedToken.word?.meaning ??
      dictionaryEntry?.english ??
      'Definition not found.'

    return (
      <div className="reader-word-popover reader-word-popover-minimal" aria-live="polite" onClick={onClose}>
        <button type="button" className="popover-close" aria-label="Close definition" onClick={onClose}>
          ×
        </button>
        <span className="reader-word-pinyin">{pinyin}</span>
        <p>{definition}</p>
      </div>
    )
  }

  if (selectedToken.word) {
    return (
      <div className="reader-word-popover" aria-live="polite" onClick={onClose}>
        <button type="button" className="popover-close" onClick={onClose}>
          Close
        </button>
        <strong>{selectedToken.word.word}</strong>
        <span>{selectedToken.word.pinyin ?? selectedToken.pinyin}</span>
        <p>{selectedToken.word.meaning}</p>
        <button
          type="button"
          className="ghost-answer"
          onClick={(event) => {
            event.stopPropagation()
            if (selectedToken.word) onEditWord(selectedToken.word)
          }}
        >
          Edit card
        </button>
        <dl className="stat-list compact-stats">
          <div>
            <dt>FSRS</dt>
            <dd>{fsrsQueueLabel(selectedToken.word)}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>{formatDueDate(selectedToken.word.fsrsDueAt)}</dd>
          </div>
        </dl>
      </div>
    )
  }

  if (!selectedToken.isChinese) return null

  const savePinyin = dictionaryEntry?.pinyin ?? selectedToken.pinyin ?? ''
  const saveMeaning = dictionaryEntry?.english ?? ''

  return (
    <div className="reader-word-popover" aria-live="polite" onClick={onClose}>
      <button type="button" className="popover-close" onClick={onClose}>
        Close
      </button>
      <strong>{selectedToken.text}</strong>
      <span>{savePinyin}</span>
      {saveMeaning ? (
        <p>{saveMeaning}</p>
      ) : (
        <p className="reader-word-hint">No dictionary match — add it, then edit the meaning.</p>
      )}
      <button
        type="button"
        className="primary"
        onClick={(event) => {
          event.stopPropagation()
          void onSaveWord(selectedToken.text, savePinyin, saveMeaning)
        }}
      >
        {saveMeaning ? 'Save to deck' : 'Add to deck'}
      </button>
    </div>
  )
}
