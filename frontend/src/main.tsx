import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './lib/appkit' // side-effect: initializes Reown AppKit before first render
import './index.css'
import { ReplicourtProvider } from './lib/ReplicourtProvider'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ReplicourtProvider>
        <App />
      </ReplicourtProvider>
    </BrowserRouter>
  </StrictMode>,
)
