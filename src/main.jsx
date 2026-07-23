import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// One-time self-heal: unregister any stale service workers and wipe caches
// left over from previous deployments. Older builds (and any rogue SW at a
// broader scope on this domain) can keep serving outdated/broken assets,
// which shows up as the page rendering for a second and then going white
// once the stale SW claims the page and forces a reload.
async function resetStaleServiceWorkers() {
  const FLAG = 'pingdrop_sw_reset_v1'
  try {
    if (localStorage.getItem(FLAG)) return false
    localStorage.setItem(FLAG, '1')
  } catch {
    return false
  }
  if (!('serviceWorker' in navigator)) return false
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    let removed = false
    for (const reg of regs) {
      await reg.unregister()
      removed = true
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    return removed
  } catch {
    return false
  }
}

resetStaleServiceWorkers().then((needsReload) => {
  if (needsReload) {
    window.location.reload()
    return
  }
  registerSW({ immediate: true })
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
