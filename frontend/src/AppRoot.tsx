import { ReplicourtProvider } from './lib/ReplicourtProvider'
import App from './App'

export default function AppRoot() {
  return (
    <ReplicourtProvider>
      <App />
    </ReplicourtProvider>
  )
}
