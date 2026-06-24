import { useEffect, useMemo, useState } from 'react'
import type { HotkeySettings } from '../types'

type RenpyBuildState = 'checking' | 'ready' | 'missing'

interface RenpyPrototypeModeProps {
  hotkeys: HotkeySettings
  onReturnToLibrary: () => void
  onOpenReactVisualNovel: () => void
}

const RENPY_STORY_ID = 'just-friends'

export function RenpyPrototypeMode({
  hotkeys,
  onReturnToLibrary,
  onOpenReactVisualNovel,
}: RenpyPrototypeModeProps) {
  const [buildState, setBuildState] = useState<RenpyBuildState>('checking')
  const [lastEvent, setLastEvent] = useState<string>('Waiting for RenPy...')
  const renpyUrl = useMemo(() => publicAssetPath(`renpy/${RENPY_STORY_ID}/index.html`), [])

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
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <section className="screen renpy-prototype-screen">
      <div className="screen-heading compact renpy-prototype-heading">
        <div>
          <h1>RenPy Prototype</h1>
          <p>Just Friends? embedded as an exported RenPy web build.</p>
        </div>
        <div className="button-group">
          <button type="button" onClick={onOpenReactVisualNovel}>
            React VN
          </button>
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
            Generate the source with <code>npm run vn:renpy:convert</code>, build
            <code> renpy/just-friends</code> in RenPy, then copy the web export to
            <code> public/renpy/just-friends</code>.
          </p>
          <p>
            Verify it with <code>npm run vn:renpy:verify-web</code>.
          </p>
        </section>
      )}

      {buildState === 'ready' && (
        <div className="renpy-prototype-frame-wrap">
          <iframe
            className="renpy-prototype-frame"
            title="RenPy Just Friends prototype"
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
