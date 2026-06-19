import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { WordInfoPopover } from '../WordInfoPopover'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import {
  deleteComicPack,
  ensureSampleComicPack,
  getComicChapter,
  getComicChapters,
  getComicImage,
  getComicPack,
  getComicProgress,
  importComicPack,
  listComicPacks,
  lookupDictionary,
  saveComicProgress,
  upsertWords,
} from '../db'
import {
  DEFAULT_COMIC_TRANSLATION_MODE,
  calculateComicCoverage,
  comicProgressId,
  isComicPackDuplicateError,
  makeDefaultComicProgress,
  shouldShowComicTranslation,
} from './comicPack'
import type {
  ComicBubble,
  ComicChapterRecord,
  ComicPackRecord,
  ComicPackSummary,
  ComicProgress,
  ComicTranslationMode,
  DictionaryEntry,
  ReaderWordToken,
  VocabWord,
} from '../types'

interface ComicReaderModeProps {
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  onEditWord: (word: VocabWord) => void
  onWordsChanged: () => void | Promise<void>
  onReturnHome: () => void
}

type ComicView = 'library' | 'chapters' | 'reader'

const translationModes: Array<{ value: ComicTranslationMode; label: string }> = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'tap', label: 'Tap' },
  { value: 'visible', label: 'Visible' },
]

export function ComicReaderMode({
  words,
  pinyinMode,
  onEditWord,
  onWordsChanged,
  onReturnHome,
}: ComicReaderModeProps) {
  const [view, setView] = useState<ComicView>('library')
  const [packs, setPacks] = useState<ComicPackSummary[]>([])
  const [activePack, setActivePack] = useState<ComicPackRecord | null>(null)
  const [chapters, setChapters] = useState<ComicChapterRecord[]>([])
  const [activeChapter, setActiveChapter] = useState<ComicChapterRecord | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [translationMode, setTranslationMode] = useState<ComicTranslationMode>(DEFAULT_COMIC_TRANSLATION_MODE)
  const [showSoundEffects, setShowSoundEffects] = useState(false)
  const [revealedBubbleIds, setRevealedBubbleIds] = useState<Set<string>>(new Set())
  const [selectedToken, setSelectedToken] = useState<ReaderWordToken | null>(null)
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const readerTopRef = useRef<HTMLDivElement | null>(null)

  const activePage = activeChapter?.pages[pageIndex]
  const isFirstPage = chapters[0]?.id === activeChapter?.id && pageIndex <= 0
  const isLastPage =
    chapters.at(-1)?.id === activeChapter?.id &&
    pageIndex >= (activeChapter?.pages.length ?? 1) - 1
  const visibleBubbles = useMemo(
    () => (activePage?.bubbles ?? []).filter((bubble) => showSoundEffects || bubble.type !== 'sfx'),
    [activePage, showSoundEffects],
  )

  const loadLibrary = useCallback(async () => {
    try {
      setLoadState('loading')
      await ensureSampleComicPack()
      setPacks(await listComicPacks())
      setLoadState('ready')
    } catch (error) {
      console.error(error)
      setMessage(error instanceof Error ? error.message : 'Comic Reader failed to load.')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLibrary(), 0)
    return () => window.clearTimeout(timeout)
  }, [loadLibrary])

  useEffect(() => {
    if (!selectedToken || selectedToken.word || !selectedToken.isChinese) return
    let cancelled = false
    lookupDictionary(selectedToken.text)
      .then((entry) => {
        if (!cancelled) setDictionaryEntry(entry ?? null)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [selectedToken])

  useEffect(() => {
    if (!activePack || !activeChapter) return
    const progress: ComicProgress = {
      id: comicProgressId(activePack.id),
      packId: activePack.id,
      chapterId: activeChapter.id,
      pageIndex,
      updatedAt: new Date().toISOString(),
      translationMode,
      showSoundEffects,
    }
    void saveComicProgress(progress).catch(console.error)
  }, [activePack, activeChapter, pageIndex, translationMode, showSoundEffects])

  useEffect(() => {
    if (view !== 'reader') return
    const timeout = window.setTimeout(() => {
      const top = readerTopRef.current
        ? readerTopRef.current.getBoundingClientRect().top + window.scrollY
        : 0
      window.scrollTo({ top, behavior: 'auto' })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [activeChapter?.id, pageIndex, view])

  const goToPage = useCallback((nextChapter: ComicChapterRecord, nextPageIndex: number) => {
    setActiveChapter(nextChapter)
    setPageIndex(Math.max(0, Math.min(nextPageIndex, nextChapter.pages.length - 1)))
    setSelectedToken(null)
    setDictionaryEntry(null)
    setRevealedBubbleIds(new Set())
    window.requestAnimationFrame(() => readerTopRef.current?.scrollIntoView({ block: 'start' }))
  }, [])

  const movePage = useCallback((delta: number) => {
    if (!activeChapter) return
    const currentChapterIndex = chapters.findIndex((chapter) => chapter.id === activeChapter.id)
    const nextPage = pageIndex + delta
    if (nextPage >= 0 && nextPage < activeChapter.pages.length) {
      goToPage(activeChapter, nextPage)
      return
    }
    if (delta > 0 && currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1) {
      goToPage(chapters[currentChapterIndex + 1], 0)
      return
    }
    if (delta < 0 && currentChapterIndex > 0) {
      const previousChapter = chapters[currentChapterIndex - 1]
      goToPage(previousChapter, previousChapter.pages.length - 1)
    }
  }, [activeChapter, chapters, goToPage, pageIndex])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (view !== 'reader') return
      const target = event.target
      const isInteractive =
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      if (isInteractive) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        movePage(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        movePage(1)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedToken(null)
        setDictionaryEntry(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [movePage, view])

  async function openPack(packId: string, mode: 'continue' | 'start' = 'continue') {
    const [pack, chapterRows, progress] = await Promise.all([
      getComicPack(packId),
      getComicChapters(packId),
      getComicProgress(packId),
    ])
    if (!pack || chapterRows.length === 0) {
      setMessage('That comic pack is missing its chapter data.')
      return
    }
    setActivePack(pack)
    setChapters(chapterRows)
    const restoredProgress = progress ?? makeDefaultComicProgress(pack.id, chapterRows[0].id)
    const chapter =
      mode === 'continue'
        ? chapterRows.find((item) => item.id === restoredProgress.chapterId) ?? chapterRows[0]
        : chapterRows[0]
    setTranslationMode(mode === 'continue' ? restoredProgress.translationMode : DEFAULT_COMIC_TRANSLATION_MODE)
    setShowSoundEffects(mode === 'continue' ? restoredProgress.showSoundEffects : false)
    setPageIndex(mode === 'continue' ? Math.min(restoredProgress.pageIndex, chapter.pages.length - 1) : 0)
    setActiveChapter(chapter)
    setRevealedBubbleIds(new Set())
    setSelectedToken(null)
    setDictionaryEntry(null)
    setView(mode === 'continue' ? 'reader' : 'chapters')
  }

  async function startChapter(chapterId: string, restore = false) {
    if (!activePack) return
    const chapter = await getComicChapter(activePack.id, chapterId)
    if (!chapter) {
      setMessage('That chapter could not be found.')
      return
    }
    const progress = restore ? await getComicProgress(activePack.id) : null
    setActiveChapter(chapter)
    setPageIndex(progress?.chapterId === chapter.id ? Math.min(progress.pageIndex, chapter.pages.length - 1) : 0)
    setRevealedBubbleIds(new Set())
    setSelectedToken(null)
    setDictionaryEntry(null)
    setView('reader')
    window.requestAnimationFrame(() => readerTopRef.current?.scrollIntoView({ block: 'start' }))
  }

  async function handleImportFile(file?: File) {
    if (!file) return
    try {
      setImporting(true)
      setMessage(null)
      setPendingReplaceFile(null)
      const summary = await importComicPack(file)
      setMessage(`Imported ${summary.title}: ${summary.chapters} chapter, ${summary.pages} pages.`)
      await loadLibrary()
    } catch (error) {
      if (isComicPackDuplicateError(error)) {
        setPendingReplaceFile(file)
        setMessage(error instanceof Error ? error.message : 'This pack already exists.')
      } else {
        setMessage(error instanceof Error ? error.message : 'Comic pack import failed.')
      }
    } finally {
      setImporting(false)
    }
  }

  async function replacePendingPack() {
    if (!pendingReplaceFile) return
    try {
      setImporting(true)
      const summary = await importComicPack(pendingReplaceFile, { replace: true })
      setPendingReplaceFile(null)
      setMessage(`Replaced ${summary.title}.`)
      await loadLibrary()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Comic pack replacement failed.')
    } finally {
      setImporting(false)
    }
  }

  async function removePack(pack: ComicPackSummary) {
    if (!window.confirm(`Delete "${pack.title}" from this device?`)) return
    await deleteComicPack(pack.id)
    if (activePack?.id === pack.id) {
      setActivePack(null)
      setChapters([])
      setActiveChapter(null)
      setView('library')
    }
    await loadLibrary()
  }

  async function saveWord(text: string, pinyin: string, meaning: string) {
    await upsertWords([{
      id: crypto.randomUUID(),
      word: text,
      meaning,
      pinyin,
      status: 'learning',
      seenCount: 0,
      correctCount: 0,
      wrongCount: 0,
      listenedSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    await onWordsChanged()
  }

  if (loadState === 'loading') {
    return (
      <section className="screen comic-reader-screen">
        <div className="panel empty-state">
          <h1>Loading Comic Reader...</h1>
        </div>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section className="screen comic-reader-screen">
        <div className="panel empty-state">
          <h1>Comic Reader could not load</h1>
          <p>{message}</p>
          <button type="button" onClick={loadLibrary}>Try again</button>
        </div>
      </section>
    )
  }

  return (
    <section className={`screen comic-reader-screen comic-view-${view}`} ref={readerTopRef}>
      {view !== 'reader' && (
        <div className="comic-reader-topbar">
          <button type="button" className="ghost-answer" onClick={view === 'library' ? onReturnHome : () => setView('library')}>
            {view === 'library' ? 'Back to Dashboard' : 'Back'}
          </button>
          <div>
            <h1>{view === 'library' ? 'Comic Reader' : activePack?.title ?? 'Comic Reader'}</h1>
            <p>{view === 'library' ? 'Imported packs stay on this device.' : activePack?.titleChinese}</p>
          </div>
        </div>
      )}

      {message && <div className="comic-reader-message" role="status">{message}</div>}

      {view === 'library' && (
        <>
          <section className="comic-import-panel panel" aria-label="Import comic pack">
            <div>
              <h2>Import Comic Pack</h2>
              <p>Choose a local <code>.comicpack.zip</code>. Images and transcripts stay inside this browser.</p>
            </div>
            <label className="comic-file-button">
              <input
                type="file"
                accept=".zip,.comicpack.zip,application/zip"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  void handleImportFile(file)
                  event.currentTarget.value = ''
                }}
              />
              {importing ? 'Importing...' : 'Choose ZIP'}
            </label>
            {pendingReplaceFile && (
              <button type="button" className="primary" onClick={replacePendingPack} disabled={importing}>
                Replace existing pack
              </button>
            )}
          </section>

          <div className="comic-library-grid">
            {packs.map((pack) => (
              <article className="comic-pack-card panel" key={pack.id}>
                <ComicCover packId={pack.id} imagePath={pack.coverImage} alt={`${pack.title} cover`} />
                <div className="comic-pack-card-body">
                  <span className="comic-pack-source">{pack.source === 'sample' ? 'Sample' : 'Imported'}</span>
                  <h2>{pack.title}</h2>
                  {pack.titleChinese && <p className="comic-chinese-title">{pack.titleChinese}</p>}
                  {pack.author && <p>{pack.author}</p>}
                  {pack.description && <small>{pack.description}</small>}
                  <dl className="stat-list compact-stats">
                    <div><dt>Chapters</dt><dd>{pack.chapterCount}</dd></div>
                    <div><dt>Pages</dt><dd>{pack.pageCount}</dd></div>
                    <div><dt>Progress</dt><dd>{pack.progress ? `${pack.progress.chapterId} · page ${pack.progress.pageIndex + 1}` : 'Not started'}</dd></div>
                  </dl>
                  <div className="button-row">
                    <button type="button" className="primary" onClick={() => void openPack(pack.id, 'continue')}>
                      Continue
                    </button>
                    <button type="button" onClick={() => void openPack(pack.id, 'start')}>
                      Start
                    </button>
                    <button type="button" className="ghost-answer" onClick={() => void removePack(pack)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {packs.length === 0 && (
              <section className="panel empty-state">
                <h2>No comics yet</h2>
                <p>Import a local comic pack to read Chinese transcripts with your existing word cards.</p>
              </section>
            )}
          </div>
        </>
      )}

      {view === 'chapters' && activePack && (
        <section className="comic-chapter-list">
          <div className="screen-heading compact">
            <div>
              <h2>Chapters</h2>
              <p>Select a chapter. Vocabulary coverage uses your saved ChunkyChinese cards only.</p>
            </div>
            <button type="button" className="primary" onClick={() => {
              const progress = packs.find((pack) => pack.id === activePack.id)?.progress
              void startChapter(progress?.chapterId ?? chapters[0]?.id, true)
            }}>
              Resume
            </button>
          </div>
          <div className="comic-chapter-grid">
            {chapters.map((chapter) => (
              <ComicChapterCard
                key={chapter.id}
                chapter={chapter}
                words={words}
                onOpen={() => void startChapter(chapter.id)}
              />
            ))}
          </div>
        </section>
      )}

      {view === 'reader' && activePack && activeChapter && activePage && (
        <section className="comic-page-reader">
          <header className="comic-reading-header">
            <button
              type="button"
              className="comic-icon-button"
              aria-label="Back to chapters"
              onClick={() => setView('chapters')}
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="comic-reading-title">
              <span className="comic-title-mark" aria-hidden="true">漫</span>
              <span>
                <strong>{activePack.title}</strong>
                <small>{activeChapter.title}</small>
              </span>
            </div>
            <span className="comic-page-indicator">{pageIndex + 1} / {activeChapter.pages.length}</span>
          </header>
          <ComicPageImage
            packId={activePack.id}
            imagePath={activePage.image}
            alt={`${activePack.title}, ${activeChapter.title}, page ${pageIndex + 1}`}
            onDismiss={() => {
              setSelectedToken(null)
              setDictionaryEntry(null)
            }}
          />
          <ol className="comic-transcript-list">
            {visibleBubbles.map((bubble, index) => (
              <ComicTranscriptLine
                key={bubble.id}
                index={index}
                bubble={bubble}
                words={words}
                pinyinMode={pinyinMode}
                selectedToken={selectedToken}
                translationMode={translationMode}
                revealedBubbleIds={revealedBubbleIds}
                onToggleTranslation={() => {
                  setRevealedBubbleIds((current) => {
                    const next = new Set(current)
                    if (next.has(bubble.id)) next.delete(bubble.id)
                    else next.add(bubble.id)
                    return next
                  })
                }}
                onSelectToken={(token) => {
                  if (token && selectedToken?.id === token.id) {
                    setSelectedToken(null)
                    setDictionaryEntry(null)
                  } else {
                    setDictionaryEntry(null)
                    setSelectedToken(token)
                  }
                }}
              />
            ))}
          </ol>

          <div className="comic-settings-strip">
            <div className="comic-setting-group">
              <span>Translation</span>
              <div className="segmented-control comic-translation-control" aria-label="Translation mode">
                {translationModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={translationMode === mode.value ? 'active' : ''}
                    onClick={() => {
                      setTranslationMode(mode.value)
                      setRevealedBubbleIds(new Set())
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="comic-setting-divider" aria-hidden="true" />
            <span className="comic-pinyin-status">Pinyin: {comicPinyinLabel(pinyinMode)}</span>
            <label className="comic-sfx-toggle">
              <input
                type="checkbox"
                checked={showSoundEffects}
                onChange={(event) => setShowSoundEffects(event.target.checked)}
              />
              SFX
            </label>
          </div>

          {selectedToken && (
            <WordInfoPopover
              selectedToken={selectedToken}
              dictionaryEntry={dictionaryEntry}
              onClose={() => {
                setSelectedToken(null)
                setDictionaryEntry(null)
              }}
              onEditWord={onEditWord}
              onSaveWord={saveWord}
              formatDueDate={formatDueDate}
            />
          )}

          <nav className="comic-reader-bottom-nav" aria-label="Comic page navigation">
            <button
              type="button"
              className="comic-page-button comic-page-previous"
              onClick={() => movePage(-1)}
              disabled={isFirstPage}
            >
              <span aria-hidden="true">←</span>
              Previous
            </button>
            <button
              type="button"
              className="comic-chapters-button"
              aria-label="Back to chapter list"
              title="Chapters"
              onClick={() => setView('chapters')}
            >
              <span aria-hidden="true">≡</span>
            </button>
            <button
              type="button"
              className="comic-page-button comic-page-next"
              onClick={() => movePage(1)}
              disabled={isLastPage}
            >
              Next
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        </section>
      )}
    </section>
  )
}

function ComicChapterCard({
  chapter,
  words,
  onOpen,
}: {
  chapter: ComicChapterRecord
  words: VocabWord[]
  onOpen: () => void
}) {
  const coverage = useMemo(() => calculateComicCoverage(chapter, words), [chapter, words])
  return (
    <article className="comic-chapter-card panel">
      <h3>{chapter.title}</h3>
      {chapter.titleChinese && <p className="comic-chinese-title">{chapter.titleChinese}</p>}
      <p>{chapter.pages.length} pages</p>
      <dl className="stat-list compact-stats">
        <div><dt>Known</dt><dd>{coverage.knownPercent}%</dd></div>
        <div><dt>Unique</dt><dd>{coverage.uniqueWords}</dd></div>
        <div><dt>Unknown</dt><dd>{coverage.uniqueUnknownWords}</dd></div>
      </dl>
      <small>{coverage.familiarOccurrences} familiar occurrences counted separately.</small>
      <button type="button" className="primary" onClick={onOpen}>Read chapter</button>
    </article>
  )
}

function ComicTranscriptLine({
  index,
  bubble,
  words,
  pinyinMode,
  selectedToken,
  translationMode,
  revealedBubbleIds,
  onToggleTranslation,
  onSelectToken,
}: {
  index: number
  bubble: ComicBubble
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  selectedToken: ReaderWordToken | null
  translationMode: ComicTranslationMode
  revealedBubbleIds: Set<string>
  onToggleTranslation: () => void
  onSelectToken: (token: ReaderWordToken | null) => void
}) {
  const tokens = useMemo(
    () => tokenizeReaderText(bubble.chinese, words).map((token) => ({ ...token, id: `${bubble.id}-${token.id}` })),
    [bubble.chinese, bubble.id, words],
  )
  const translationVisible = shouldShowComicTranslation(translationMode, bubble.id, revealedBubbleIds)
  return (
    <li className={`comic-transcript-line bubble-${bubble.type}`}>
      <span className="comic-transcript-number" aria-hidden="true">{index + 1}</span>
      <div className="comic-transcript-copy">
        <span className="comic-bubble-kind">{bubble.type}</span>
        <AdaptiveChineseText
          tokens={tokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
          className="comic-chinese-line"
        />
        {bubble.english && translationVisible && <p className="comic-english-line">{bubble.english}</p>}
        {translationMode === 'tap' && bubble.english && (
          <button
            type="button"
            className="comic-translation-reveal"
            aria-expanded={translationVisible}
            onClick={onToggleTranslation}
          >
            {translationVisible ? 'Hide English' : 'Tap to reveal English'}
          </button>
        )}
      </div>
    </li>
  )
}

function ComicCover({ packId, imagePath, alt }: { packId: string; imagePath?: string; alt: string }) {
  const url = useComicImageUrl(packId, imagePath)
  return (
    <div className="comic-cover-frame">
      {url ? <img src={url} alt={alt} /> : <span>No cover</span>}
    </div>
  )
}

function ComicPageImage({
  packId,
  imagePath,
  alt,
  onDismiss,
}: {
  packId: string
  imagePath: string
  alt: string
  onDismiss: () => void
}) {
  const url = useComicImageUrl(packId, imagePath)
  return (
    <figure className="comic-page-figure" onClick={onDismiss}>
      {url ? <img src={url} alt={alt} /> : <div className="comic-page-missing">Image unavailable</div>}
    </figure>
  )
}

function useComicImageUrl(packId: string, imagePath?: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    async function loadImage() {
      if (!imagePath) {
        if (!cancelled) setUrl(null)
        return
      }
      const blob = await getComicImage(packId, imagePath)
      if (!blob || cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }
    loadImage()
      .catch(console.error)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [packId, imagePath])
  return url
}

function formatDueDate(value?: string): string {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString()
}

function comicPinyinLabel(mode: AdaptivePinyinMode): string {
  if (mode === 'all') return 'All'
  if (mode === 'none') return 'Off'
  return 'Adaptive'
}
