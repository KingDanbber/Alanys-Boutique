import { icon } from './icons.js'

let deferredPrompt = null

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    showInstallBanner()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    hideInstallBanner()
  })

  // iOS: mostrar tip si no está instalada
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  if (isIos && !isStandalone && !sessionStorage.getItem('pwa-ios-tip')) {
    setTimeout(() => showIosTip(), 2500)
  }
}

function showInstallBanner() {
  if (document.getElementById('pwa-banner')) return
  const el = document.createElement('div')
  el.id = 'pwa-banner'
  el.className = 'pwa-banner'
  el.innerHTML = `
    <div class="pwa-banner-inner">
      <div class="pwa-banner-text">
        ${icon('download', 20)}
        <span>Instala Alany Admin en tu celular</span>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="pwa-btn-install" id="pwa-install">Instalar</button>
        <button type="button" class="pwa-btn-dismiss" id="pwa-dismiss" aria-label="Cerrar">${icon('x', 18)}</button>
      </div>
    </div>
  `
  document.body.appendChild(el)
  el.querySelector('#pwa-install').onclick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    hideInstallBanner()
  }
  el.querySelector('#pwa-dismiss').onclick = hideInstallBanner
}

function hideInstallBanner() {
  document.getElementById('pwa-banner')?.remove()
}

function showIosTip() {
  if (document.getElementById('pwa-banner')) return
  const el = document.createElement('div')
  el.id = 'pwa-banner'
  el.className = 'pwa-banner'
  el.innerHTML = `
    <div class="pwa-banner-inner">
      <div class="pwa-banner-text">
        ${icon('install', 20)}
        <span>En Safari: Compartir → <strong>Añadir a pantalla de inicio</strong></span>
      </div>
      <button type="button" class="pwa-btn-dismiss" id="pwa-dismiss" aria-label="Cerrar">${icon('x', 18)}</button>
    </div>
  `
  document.body.appendChild(el)
  el.querySelector('#pwa-dismiss').onclick = () => {
    sessionStorage.setItem('pwa-ios-tip', '1')
    hideInstallBanner()
  }
}
