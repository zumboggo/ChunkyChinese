/**
 * Shared bottom control bar for study modes: previous / play-pause / next.
 * Prev/next are optional so rating-driven modes can show play/pause alone.
 */
export function StudyControls({
  playing,
  onTogglePlay,
  onPrevious,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  playDisabled = false,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  playLabel,
  className = '',
}: {
  playing: boolean
  onTogglePlay: () => void
  onPrevious?: () => void
  onNext?: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  playDisabled?: boolean
  prevLabel?: string
  nextLabel?: string
  playLabel?: string
  className?: string
}) {
  return (
    <div className={`reader-controls reader-controls-icon study-controls ${className}`.trim()}>
      {onPrevious && (
        <button
          type="button"
          className="reader-btn-icon reader-btn-prev"
          onClick={onPrevious}
          disabled={prevDisabled}
          aria-label={prevLabel}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <polygon points="17,4 7,12 17,20" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="reader-btn-icon reader-btn-play"
        onClick={onTogglePlay}
        disabled={playDisabled}
        aria-label={playLabel ?? (playing ? 'Pause' : 'Play')}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <polygon points="6,3 21,12 6,21" />
          </svg>
        )}
      </button>
      {onNext && (
        <button
          type="button"
          className="reader-btn-icon reader-btn-next"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextLabel}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <polygon points="7,4 17,12 7,20" />
          </svg>
        </button>
      )}
    </div>
  )
}
