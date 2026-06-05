import type { KeyboardEvent } from 'react'
import {
  readerShouldRenderPinyin,
  readerTokenClassName,
  type AdaptivePinyinMode,
} from './adaptiveText'
import type { ReaderWordToken } from './types'

interface AdaptiveChineseTextProps {
  tokens: ReaderWordToken[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  onSelectToken: (token: ReaderWordToken | null) => void
  className?: string
}

export function AdaptiveChineseText({
  tokens,
  selectedToken,
  pinyinMode,
  onSelectToken,
  className = 'reader-sentence',
}: AdaptiveChineseTextProps) {
  function toggleToken(token: ReaderWordToken) {
    onSelectToken(selectedToken?.id === token.id ? null : token)
  }

  function handleTokenKeyDown(event: KeyboardEvent<HTMLElement>, token: ReaderWordToken) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleToken(token)
    }
  }

  return (
    <div className={className}>
      {tokens.map((token) =>
        token.isChinese ? (
          <ruby
            key={token.id}
            className={readerTokenClassName(token, selectedToken, pinyinMode)}
            tabIndex={0}
            role="button"
            aria-label={`${token.text}${token.pinyin ? `, ${token.pinyin}` : ''}`}
            onClick={() => toggleToken(token)}
            onKeyDown={(event) => handleTokenKeyDown(event, token)}
          >
            {token.text}
            {readerShouldRenderPinyin(token, pinyinMode) && <rt>{token.pinyin}</rt>}
          </ruby>
        ) : (
          <span key={token.id} className="reader-token-space">
            {token.text}
          </span>
        ),
      )}
    </div>
  )
}
