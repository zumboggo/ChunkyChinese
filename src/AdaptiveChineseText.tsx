import type { KeyboardEvent } from 'react'
import {
  readerShouldRenderPinyin,
  readerTokenClassName,
  readerWordStatusClass,
  type AdaptivePinyinMode,
} from './adaptiveText'
import type { ReaderWordToken } from './types'
import type { GrammarMatch } from './grammarPoints'

interface AdaptiveChineseTextProps {
  tokens: ReaderWordToken[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  onSelectToken: (token: ReaderWordToken | null) => void
  onGrammarSelect?: (matches: GrammarMatch[], token: ReaderWordToken) => void
  grammarTokenMap?: Map<string, GrammarMatch[]>
  className?: string
  visibleCount?: number
  /** LingQ-style word-status highlighting (reader only; defaults off). */
  statusHighlight?: boolean
}

export function AdaptiveChineseText({
  tokens,
  selectedToken,
  pinyinMode,
  onSelectToken,
  onGrammarSelect,
  grammarTokenMap,
  className = 'reader-sentence',
  visibleCount,
  statusHighlight = false,
}: AdaptiveChineseTextProps) {
  function toggleToken(token: ReaderWordToken) {
    const grammarMatches = grammarTokenMap?.get(token.id)
    if (grammarMatches && grammarMatches.length > 0 && onGrammarSelect) {
      onGrammarSelect(grammarMatches, token)
      return
    }
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
      {renderedTokens.map((token, index) => {
        const grammarMatches = grammarTokenMap?.get(token.id)
        const hasGrammar = grammarMatches && grammarMatches.length > 0
        return token.isChinese ? (
          <ruby
            key={token.id}
            className={`${readerTokenClassName(token, selectedToken, pinyinMode)}${statusHighlight ? ` ${readerWordStatusClass(token)}`.trimEnd() : ''}${hasGrammar ? ' grammar-highlight' : ''}${hasReveal ? ' vn-token-reveal' : ''}`}
            style={hasReveal ? { animationDelay: `${index * 30}ms` } : undefined}
            tabIndex={0}
            role="button"
            aria-label={`${token.text}${token.pinyin ? `, ${token.pinyin}` : ''}${hasGrammar ? `, grammar: ${grammarMatches[0].point.pattern}` : ''}`}
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
        )
      })}
    </div>
  )
}
