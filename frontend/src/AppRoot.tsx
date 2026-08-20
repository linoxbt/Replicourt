import './lib/appkit' // side-effect: initializes Reown AppKit — isolated in this lazy chunk
                       // so the ~1.8MB wallet-connect bundle doesn't block first paint.
import { ReplicourtProvider } from './lib/ReplicourtProvider'
import App from './App'

export default function AppRoot() {
  return (
    <ReplicourtProvider>
      <App />
    </ReplicourtProvider>
  )
}
