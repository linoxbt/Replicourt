import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './index.css'

const AppRoot = lazy(() => import('./AppRoot'))

// A deploy replaces every hashed chunk file; a tab left open across one (or a
// stale cached index.html) still references the old hash, so the lazy import
// above 404s with "Failed to fetch dynamically imported module." Vite emits
// this event for exactly that case — self-heal with one reload instead of
// falling through to the ErrorBoundary's generic screen. Guarded so a
// genuinely broken deploy (not just a stale chunk) reloads once, then falls
// through to the ErrorBoundary's manual Reload button rather than looping.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('rc-reloaded-once')) return
  sessionStorage.setItem('rc-reloaded-once', '1')
  window.location.reload()
})

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
