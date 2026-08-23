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

// body's background is near-black under prefers-color-scheme: dark (see
// index.css) from the instant the CSS loads — well before the JS bundle
// finishes. An empty Suspense fallback during that window isn't "no loading
// state," it's a solid black page with nothing on it at all, which reads as
// completely broken rather than simply loading. This has to render
// *something* visible for as long as AppRoot is in flight.
function BootLoading() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--color-accent-emphasis)', borderTopColor: 'transparent' }}
        aria-label="Loading"
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<BootLoading />}>
          <AppRoot />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
