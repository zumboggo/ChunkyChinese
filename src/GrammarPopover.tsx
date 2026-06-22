import type { GrammarMatch } from './grammarPoints'

interface GrammarPopoverProps {
  matches: GrammarMatch[]
  onClose: () => void
}

export function GrammarPopover({ matches, onClose }: GrammarPopoverProps) {
  if (matches.length === 0) return null

  return (
    <div className="reader-word-popover grammar-popover" aria-live="polite" onClick={onClose}>
      <button type="button" className="popover-close" aria-label="Close grammar" onClick={onClose}>
        ×
      </button>
      <div className="grammar-popover-header">
        <strong>Grammar Point</strong>
        <span className="grammar-level">{matches[0].point.level}</span>
      </div>
      {matches.map((match) => (
        <div key={match.grammarId} className="grammar-popover-item">
          <div className="grammar-pattern">
            <span className="grammar-chinese">{match.point.pattern}</span>
            <span className="grammar-pinyin">{match.point.pinyin}</span>
          </div>
          <p className="grammar-explanation">{match.point.explanation}</p>
          <div className="grammar-example">
            <p className="grammar-example-zh">{match.point.example}</p>
            <p className="grammar-example-en">{match.point.exampleTranslation}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
