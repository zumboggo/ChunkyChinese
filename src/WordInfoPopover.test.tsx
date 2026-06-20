import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WordInfoPopover } from './WordInfoPopover'
import type { ReaderWordToken, VocabWord } from './types'

const savedWord: VocabWord = {
  id: 'word-1',
  word: '照顾',
  pinyin: 'zhào gù',
  meaning: 'to look after',
  status: 'learning',
  seenCount: 0,
  correctCount: 0,
  wrongCount: 0,
  listenedSeconds: 0,
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
}

const selectedToken: ReaderWordToken = {
  id: 'token-1',
  text: '照顾',
  index: 0,
  isChinese: true,
  pinyin: 'zhào gù',
  word: savedWord,
}

describe('WordInfoPopover', () => {
  it('renders only pinyin and definition content in minimal mode', () => {
    const markup = renderToStaticMarkup(
      <WordInfoPopover
        selectedToken={selectedToken}
        dictionaryEntry={null}
        onClose={vi.fn()}
        onEditWord={vi.fn()}
        onSaveWord={vi.fn()}
        formatDueDate={() => ''}
        minimal
      />,
    )

    expect(markup).toContain('zhào gù')
    expect(markup).toContain('to look after')
    expect(markup).not.toContain('照顾')
    expect(markup).not.toContain('Edit card')
    expect(markup).not.toContain('FSRS')
    expect(markup).not.toContain('Due')
  })
})
