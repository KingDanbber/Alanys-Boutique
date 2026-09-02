import { getProfile, signOut } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import { CONFIG } from '../lib/config.js'
import { formatMoney, formatDate, toast, escapeHtml } from '../lib/utils.js'
import { icon } from '../lib/icons.js'
import { renderDevReturnBar } from '../lib/dev-return.js'
import { renderBottomNav } from './nav.js'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function renderDashboard(root) {
  const profile = getProfile()
  const name = profile?.full_name?.split(' ')[0] || 'Admin'

  root.innerHTML = `
    <div class="page app-page">
      ${renderDevReturnBar()}
      <header class="topbar">
        <div>
          <p class="muted small">Hola,</p>
          <h1 class="topbar-title">${escapeHtml(name)}</h1>
        </div>
        <img src="assets/logo.jpg" alt="" class="logo-xs" />
      </header>

      <section class="section">
        <div class="kpi-grid" id="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Ventas hoy</span>
            <span class="kpi-value" id="kpi-sales">…</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Pedidos hoy</span>
            <span class="kpi-value" id="kpi-orders">…</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Stock bajo</span>
            <span class="kpi-value" id="kpi-stock">…</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Ganancia mes</span>
            <span class="kpi-value" id="kpi-profit">…</span>
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
        <div class="section-head">
          <h2 class="section-title">Últimos pedidos</h2>
          <a href="#/pedidos" class="muted small">Ver todos</a>
        </div>
        <div id="recent-orders">
          <p class="muted center small">Cargando...</p>
        </div>
      </section>

      <section class="section" id="low-stock-section" hidden>
        <div class="section-head">
          <h2 class="section-title">Stock bajo</h2>
          <a href="#/productos" class="muted small">Productos</a>
        </div>
        <div id="low-stock-list"></div>
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

  await loadDashboardData(root)
}

async function loadDashboardData(root) {
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  const elSales = root.querySelector('#kpi-sales')
  const elOrders = root.querySelector('#kpi-orders')
  const elStock = root.querySelector('#kpi-stock')
  const elProfit = root.querySelector('#kpi-profit')
  const recentBox = root.querySelector('#recent-orders')

  if (!businessId) {
    elSales.textContent = '$0'
    elOrders.textContent = '0'
    elStock.textContent = '0'
    elProfit.textContent = '$0'
    recentBox.innerHTML = `<p class="muted center small">Sin negocio asignado</p>`
    return
  }

  const today = startOfToday()
  const month = startOfMonth()

  try {
    const [
      { data: ordersToday, error: e1 },
      { data: ordersMonth, error: e2 },
      { data: products, error: e3 },
      { data: recent, error: e4 },
    ] = await Promise.all([
      sb
        .from('orders')
        .select('id, total_sale, status, created_at')
        .eq('business_id', businessId)
        .gte('created_at', today)
        .neq('status', 'cancelado'),
      sb
        .from('orders')
        .select('total_profit, status, created_at')
        .eq('business_id', businessId)
        .gte('created_at', month)
        .neq('status', 'cancelado'),
      sb
        .from('products')
        .select('id, name, stock, min_stock')
        .eq('business_id', businessId)
        .eq('is_active', true),
      sb
        .from('orders')
        .select('id, order_number, total_sale, status, created_at, clients(name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (e1) throw e1
    if (e2) throw e2
    if (e3) throw e3
    if (e4) throw e4

    const salesToday = (ordersToday || []).reduce((s, o) => s + Number(o.total_sale || 0), 0)
    const countToday = (ordersToday || []).length
    const profitMonth = (ordersMonth || []).reduce((s, o) => s + Number(o.total_profit || 0), 0)
    const lowStock = (products || []).filter((p) => Number(p.stock) <= Number(p.min_stock || 0))

    elSales.textContent = formatMoney(salesToday)
    elOrders.textContent = String(countToday)
    elStock.textContent = String(lowStock.length)
    elProfit.textContent = formatMoney(profitMonth)

    if (lowStock.length > 0) {
      elStock.classList.add('warn')
    } else {
      elStock.classList.remove('warn')
    }

    // Recent orders
    if (!recent?.length) {
      recentBox.innerHTML = `<p class="muted center small">Aún no hay pedidos</p>`
    } else {
      recentBox.innerHTML = recent.map((o) => {
        const st = statusClass(o.status)
        return `
          <a href="#/pedidos" class="dash-order-row">
            <div>
              <strong>#${o.order_number || '—'} · ${escapeHtml(o.clients?.name || 'Cliente')}</strong>
              <p class="muted small">${formatDate(o.created_at)}</p>
            </div>
            <div class="dash-order-right">
              <span class="status-badge ${st}">${statusLabel(o.status)}</span>
              <strong class="text-brand">${formatMoney(o.total_sale)}</strong>
            </div>
          </a>
        `
      }).join('')
    }

    // Low stock list
    const lowSec = root.querySelector('#low-stock-section')
    const lowList = root.querySelector('#low-stock-list')
    if (lowStock.length) {
      lowSec.hidden = false
      lowList.innerHTML = lowStock.slice(0, 6).map((p) => `
        <div class="dash-stock-row">
          <span>${escapeHtml(p.name)}</span>
          <strong class="warn">Stock ${p.stock} / mín ${p.min_stock}</strong>
        </div>
      `).join('')
    } else {
      lowSec.hidden = true
    }
  } catch (err) {
    console.error(err)
    elSales.textContent = '$0'
    elOrders.textContent = '0'
    elStock.textContent = '0'
    elProfit.textContent = '$0'
    recentBox.innerHTML = `<p class="error center small">${escapeHtml(err.message || 'Error al cargar')}</p>`
    toast(err.message || 'Error al cargar dashboard', 'error')
  }
}

function statusLabel(id) {
  const map = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    entregado: 'Entregado',
    pagado: 'Pagado',
    cancelado: 'Cancelado',
  }
  return map[id] || id
}

function statusClass(id) {
  const map = {
    pendiente: 'st-pending',
    en_proceso: 'st-process',
    entregado: 'st-done',
    pagado: 'st-paid',
    cancelado: 'st-cancel',
  }
  return map[id] || 'st-pending'
}
