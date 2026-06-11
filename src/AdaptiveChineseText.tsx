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
  visibleCount?: number
}

export function AdaptiveChineseText({
  tokens,
  selectedToken,
  pinyinMode,
  onSelectToken,
  className = 'reader-sentence',
  visibleCount,
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

  const renderedTokens = visibleCount !== undefined ? tokens.slice(0, visibleCount) : tokens
  const hasReveal = visibleCount !== undefined && visibleCount < tokens.length

  return (
    <div className={className}>
      {renderedTokens.map((token, index) =>
        token.isChinese ? (
          <ruby
            key={token.id}
            className={`${readerTokenClassName(token, selectedToken, pinyinMode)}${hasReveal ? ' vn-token-reveal' : ''}`}
            style={hasReveal ? { animationDelay: `${index * 30}ms` } : undefined}
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
          <span
            key={token.id}
            className={`reader-token-space${hasReveal ? ' vn-token-reveal' : ''}`}
            style={hasReveal ? { animationDelay: `${index * 30}ms` } : undefined}
          >
            {token.text}
          </span>
        ),
      )}
    </div>
  )
}
