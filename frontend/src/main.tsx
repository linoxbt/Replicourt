import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

const AppRoot = lazy(() => import('./AppRoot'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <AppRoot />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
