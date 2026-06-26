import { useEffect, useMemo, useState } from 'react'
import type { HotkeySettings } from '../types'

type RenpyBuildState = 'checking' | 'ready' | 'missing'

interface RenpyPrototypeModeProps {
  hotkeys: HotkeySettings
  onReturnToLibrary: () => void
  /** Optional button to jump back to the React-based visual novel engine. */
  onOpenReactVisualNovel?: () => void
  /** Which exported build under public/renpy/<storyId> to embed. */
  storyId?: string
  title?: string
  description?: string
  /** Folder name shown in the "not found" help text. */
  sourceDir?: string
}

export function RenpyPrototypeMode({
  hotkeys,
  onReturnToLibrary,
  onOpenReactVisualNovel,
  storyId = 'just-friends',
  title = 'RenPy Prototype',
  description = 'Just Friends? embedded as an exported RenPy web build.',
  sourceDir,
}: RenpyPrototypeModeProps) {
  const [buildState, setBuildState] = useState<RenpyBuildState>('checking')
  const [lastEvent, setLastEvent] = useState<string>('Waiting for RenPy...')
  const renpyUrl = useMemo(() => publicAssetPath(`renpy/${storyId}/index.html`), [storyId])
  const projectDir = sourceDir ?? `renpy/${storyId}`

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function checkBuild() {
      try {
        const response = await fetch(renpyUrl, { cache: 'no-store' })
        const html = response.ok ? await response.text() : ''
        const looksLikeRenpyExport = /ren['’]?py|emscripten|game\.(zip|data)/iu.test(html)
        if (!cancelled) setBuildState(response.ok && looksLikeRenpyExport ? 'ready' : 'missing')
      } catch {
        if (!cancelled) setBuildState('missing')
      }
    }
    void checkBuild()
    return () => {
      cancelled = true
    }
  }, [renpyUrl])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const payload = event.data?.payload
      if (event.data?.source !== 'chunky-renpy' || !payload) return
      if (payload.type === 'ready') setLastEvent('RenPy ready.')
      if (payload.type === 'lineChanged') setLastEvent(`Line ${payload.nodeId}`)
      if (payload.type === 'choiceSelected') setLastEvent(`Choice ${payload.choiceId}`)
      if (payload.type === 'questComplete') setLastEvent('Quest complete.')
      if (payload.type === 'chapterStart') setLastEvent(`Chapter ${payload.chapterId}`)
      if (payload.type === 'chapterComplete') setLastEvent(`Chapter complete: ${payload.chapterId}`)
      if (payload.type === 'endingReached') setLastEvent(`Ending: ${payload.endingId}`)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <section className="screen renpy-prototype-screen">
      <div className="screen-heading compact renpy-prototype-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="button-group">
          {onOpenReactVisualNovel && (
            <button type="button" onClick={onOpenReactVisualNovel}>
              React VN
            </button>
          )}
          <button type="button" onClick={onReturnToLibrary}>
            Library
          </button>
        </div>
      </div>

      {buildState === 'checking' && (
        <section className="panel renpy-prototype-empty" role="status">
          <h2>Checking export...</h2>
          <p>Looking for the RenPy web files.</p>
        </section>
      )}

      {buildState === 'missing' && (
        <section className="panel renpy-prototype-empty">
          <h2>RenPy web export not found</h2>
          <p>
            Build <code>{projectDir}</code> in RenPy, then copy the web export to
            <code> public/renpy/{storyId}</code>.
          </p>
        </section>
      )}

      {buildState === 'ready' && (
        <div className="renpy-prototype-frame-wrap">
          <iframe
            className="renpy-prototype-frame"
            title={`RenPy ${title}`}
            src={renpyUrl}
            onLoad={(event) => {
              const frame = event.currentTarget.contentWindow
              frame?.postMessage({
                source: 'chunky-app',
                type: 'chunkyInit',
                hotkeys: {
                  choiceA: hotkeys.choiceA,
                  choiceB: hotkeys.choiceB,
                  playPause: hotkeys.playPause,
                },
              }, '*')
            }}
          />
          <div className="renpy-prototype-status" role="status">
            <span>{lastEvent}</span>
            <span>
              {hotkeys.choiceA.toUpperCase()} / {hotkeys.choiceB.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

function publicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}
