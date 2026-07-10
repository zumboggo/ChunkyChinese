import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppErrorBoundary } from './AppErrorBoundary.tsx'
import App from './App.tsx'
import { markStartup } from './startupPerformance.ts'

markStartup('shell-rendered')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
