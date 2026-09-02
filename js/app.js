import { initAuth, getSession, isDeveloper } from './lib/auth.js'
import { renderWelcome } from './modules/welcome.js'
import { renderLogin } from './modules/login.js'
import { renderRegister } from './modules/register.js'
import { renderDashboard } from './modules/dashboard.js'
import { renderProducts } from './modules/products.js'
import { renderPlaceholder } from './modules/placeholder.js'
import { renderClients } from './modules/clients.js'
import { renderOrders } from './modules/orders.js'
import { initPWA } from './lib/pwa.js'
import {
  renderDevOverview,
  renderDevModules,
  renderDevUsers,
  renderDevData,
  renderDevSettings,
} from './modules/developer.js'

const app = document.getElementById('app')

const routes = {
  '/': renderWelcome,
  '/login': renderLogin,
  '/register': renderRegister,
  '/dashboard': renderDashboard,
  '/productos': renderProducts,
  '/pedidos': renderOrders,
  '/clientes': renderClients,
  '/gastos': (root) => renderPlaceholder(root, 'Gastos', 'mas'),
  '/mas': (root) => renderPlaceholder(root, 'Más', 'mas'),
  '/developer': renderDevOverview,
  '/developer/modules': renderDevModules,
  '/developer/users': renderDevUsers,
  '/developer/data': renderDevData,
  '/developer/settings': renderDevSettings,
}

function getPath() {
  const hash = location.hash.replace(/^#/, '') || '/'
  return hash.startsWith('/') ? hash : '/' + hash
}

function guard(path) {
  const session = getSession()
  const publicPaths = ['/', '/login', '/register']
  if (!session && !publicPaths.includes(path)) {
    location.hash = '#/login'
    return false
  }
  if (session && (path === '/login' || path === '/register' || path === '/')) {
    location.hash = isDeveloper() ? '#/developer' : '#/dashboard'
    return false
  }
  if (path.startsWith('/developer') && session && !isDeveloper()) {
    location.hash = '#/dashboard'
    return false
  }
  return true
}

async function router() {
  const path = getPath()
  if (!guard(path)) return
  const handler = routes[path] || routes['/']
  app.innerHTML = ''
  await handler(app)
}

async function boot() {
  app.innerHTML = `<div class="boot">Cargando…</div>`
  try {
    await initAuth()
  } catch (e) {
    console.error(e)
  }
  await router()
  window.addEventListener('hashchange', () => router())
}

boot()

initPWA()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
