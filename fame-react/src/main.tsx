import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    // Always check for a newer service worker (pick up the push handler).
    await registration.update()
    // Reload once when a new worker takes over, so the page is controlled.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (navigator.serviceWorker.controller) window.location.reload()
    })
  } catch (error) {
    console.error('FAME service worker registration failed:', error)
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', registerServiceWorker)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
