import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error?: Error
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {}

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Chunky Chinese app crashed.', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-crash screen">
        <section className="app-crash-panel">
          <p className="eyebrow">Recovery</p>
          <h1>Chunky Chinese hit a startup error.</h1>
          <p>
            Your study data is still stored locally. First try refreshing the app shell cache; if that
            does not help, clear site data from browser settings.
          </p>
          <pre>{this.state.error.message}</pre>
          <div className="button-group">
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" onClick={() => resetAppShell()}>
              Reset app shell cache
            </button>
          </div>
        </section>
      </main>
    )
  }
}

async function resetAppShell() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('chunky-chinese-')).map((key) => caches.delete(key)))
  }
  window.location.replace(`${window.location.origin}${import.meta.env.BASE_URL}`)
}
