import { getProfile, signOut } from '../lib/auth.js'
import { CONFIG } from '../lib/config.js'
import { icon } from '../lib/icons.js'
import { renderBottomNav } from './nav.js'

export function renderDashboard(root) {
  const profile = getProfile()
  const name = profile?.full_name?.split(' ')[0] || 'Admin'

  root.innerHTML = `
    <div class="page app-page">
      <header class="topbar">
        <div>
          <p class="muted small">Hola,</p>
          <h1 class="topbar-title">${name}</h1>
        </div>
        <img src="assets/logo.jpg" alt="" class="logo-xs" />
      </header>

      <section class="section">
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Ventas hoy</span>
            <span class="kpi-value">$0</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Pedidos</span>
            <span class="kpi-value">0</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Stock bajo</span>
            <span class="kpi-value warn">0</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Ganancia mes</span>
            <span class="kpi-value">$0</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Acciones rápidas</h2>
        <div class="quick-grid">
          <a href="#/productos" class="quick-btn">
            <span class="quick-icon">${icon('package', 24)}</span>
            <span>Productos</span>
          </a>
          <a href="#/pedidos" class="quick-btn">
            <span class="quick-icon">${icon('shoppingBag', 24)}</span>
            <span>Pedidos</span>
          </a>
          <a href="#/clientes" class="quick-btn">
            <span class="quick-icon">${icon('users', 24)}</span>
            <span>Clientes</span>
          </a>
          <a href="#/gastos" class="quick-btn">
            <span class="quick-icon">${icon('wallet', 24)}</span>
            <span>Gastos</span>
          </a>
        </div>
      </section>

      <section class="section">
        <button type="button" class="btn btn-ghost btn-block" id="btn-logout">
          ${icon('logOut', 18)} Cerrar sesión
        </button>
        <p class="footer-note">${CONFIG.BUSINESS_NAME}</p>
      </section>

      ${renderBottomNav('dashboard')}
    </div>
  `

  root.querySelector('#btn-logout')?.addEventListener('click', async () => {
    await signOut()
    location.hash = '#/'
  })
}
