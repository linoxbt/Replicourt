import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { lazyRetry } from './lib/lazyRetry'
import './index.css'

// Retries transient fetch failures (CDN blip, flaky connection) at the import
// site itself before ever surfacing an error — see lazyRetry.ts.
const AppRoot = lazy(() => lazyRetry(() => import('./AppRoot')))

// Only reached once lazyRetry's own retries are exhausted, i.e. a genuinely
// persistent failure — most commonly a deploy that replaced every hashed
// chunk file while a stale cached index.html (or a tab open since before the
// deploy) still references an old, now-pruned hash. Self-heal with a reload
// instead of falling through to the ErrorBoundary's generic screen.
//
// Time-windowed, not a one-shot-per-tab-session flag: an earlier version of
// this guard used a plain sessionStorage flag that, once set, silently
// disabled self-healing for the rest of the tab's lifetime — so a second,
// unrelated preload failure much later in the same tab would skip straight
// to the manual error screen instead of getting its own chance to reload.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('rc-last-reload') || 0)
  const now = Date.now()
  if (now - last < 15000) return // avoid a tight loop if the deploy is genuinely broken
  sessionStorage.setItem('rc-last-reload', String(now))
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <AppRoot />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
