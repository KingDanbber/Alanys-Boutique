import { getProfile, signOut, isDeveloper } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import { toast } from '../lib/utils.js'

const DEV_NAV = [
  { id: 'overview', label: 'Overview', hash: '#/developer' },
  { id: 'modules', label: 'Módulos', hash: '#/developer/modules' },
  { id: 'users', label: 'Usuarios', hash: '#/developer/users' },
  { id: 'data', label: 'Datos', hash: '#/developer/data' },
  { id: 'settings', label: 'Config', hash: '#/developer/settings' },
]

function shell(active, body) {
  const profile = getProfile()
  return `
    <div class="page dev-page">
      <header class="dev-topbar">
        <div>
          <p class="dev-badge">DEVELOPER</p>
          <h1>Alany · Core</h1>
        </div>
        <div class="dev-user">
          <span>${profile?.full_name || 'Dev'}</span>
          <button type="button" id="dev-logout" class="dev-icon-btn" title="Salir">⎋</button>
        </div>
      </header>
      <main class="dev-main">${body}</main>
      <nav class="dev-bottom">
        ${DEV_NAV.map((n) => `
          <a href="${n.hash}" class="${active === n.id ? 'active' : ''}">${n.label}</a>
        `).join('')}
      </nav>
    </div>
  `
}

function bindLogout(root) {
  root.querySelector('#dev-logout')?.addEventListener('click', async () => {
    await signOut()
    location.hash = '#/'
  })
}

export function renderDevOverview(root) {
  if (!isDeveloper()) {
    location.hash = '#/dashboard'
    return
  }
  root.innerHTML = shell('overview', `
    <p class="dev-muted">Panel de estructura · solo Alany Boutique</p>
    <div class="dev-grid">
      <div class="dev-card"><span>Módulos</span><strong>6</strong></div>
      <div class="dev-card"><span>Estado</span><strong class="ok">OK</strong></div>
    </div>
    <div class="dev-links">
      <a href="#/developer/modules">Gestionar módulos →</a>
      <a href="#/developer/users">Usuarios del negocio →</a>
      <a href="#/dashboard">Ver app de las dueñas →</a>
    </div>
  `)
  bindLogout(root)
}

export async function renderDevModules(root) {
  if (!isDeveloper()) {
    location.hash = '#/dashboard'
    return
  }
  const sb = getSupabase()
  const { data } = await sb.from('app_modules').select('*').order('sort_order')
  const modules = data || []

  root.innerHTML = shell('modules', `
    <h2>Módulos</h2>
    <p class="dev-muted">Activa o desactiva lo que ven las dueñas</p>
    <div class="dev-list" id="mod-list">
      ${modules.map((m) => `
        <div class="dev-row" data-id="${m.id}">
          <div>
            <strong>${m.name}</strong>
            <span class="dev-muted">${m.path}</span>
          </div>
          <button type="button" class="dev-toggle ${m.is_active ? 'on' : ''}" data-id="${m.id}" data-active="${m.is_active}">
            ${m.is_active ? 'ON' : 'OFF'}
          </button>
        </div>
      `).join('') || '<p class="dev-muted">Sin módulos en DB</p>'}
    </div>
  `)
  bindLogout(root)

  root.querySelectorAll('.dev-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const next = btn.dataset.active !== 'true'
      const { error } = await sb.from('app_modules').update({ is_active: next }).eq('id', id)
      if (error) return toast(error.message, 'error')
      btn.dataset.active = String(next)
      btn.classList.toggle('on', next)
      btn.textContent = next ? 'ON' : 'OFF'
      toast('Módulo actualizado', 'ok')
    })
  })
}

export function renderDevUsers(root) {
  if (!isDeveloper()) {
    location.hash = '#/dashboard'
    return
  }
  root.innerHTML = shell('users', `
    <h2>Usuarios</h2>
    <p class="dev-muted">Cuentas admin/staff de Alany Boutique</p>
    <p class="dev-muted">Próximamente: crear dueñas desde aquí</p>
  `)
  bindLogout(root)
}

export function renderDevData(root) {
  if (!isDeveloper()) {
    location.hash = '#/dashboard'
    return
  }
  const tables = ['profiles', 'businesses', 'products', 'clients', 'orders', 'order_items', 'expenses', 'app_modules']
  root.innerHTML = shell('data', `
    <h2>Schema</h2>
    <div class="dev-list">
      ${tables.map((t) => `<div class="dev-row"><code>${t}</code></div>`).join('')}
    </div>
  `)
  bindLogout(root)
}

export function renderDevSettings(root) {
  if (!isDeveloper()) {
    location.hash = '#/dashboard'
    return
  }
  root.innerHTML = shell('settings', `
    <h2>Config</h2>
    <form id="dev-settings" class="dev-form">
      <label>Nombre del negocio</label>
      <input name="name" value="Alany Boutique" />
      <label>WhatsApp</label>
      <input name="whatsapp" value="8716079531" />
      <label>Facebook</label>
      <input name="facebook" value="Alany boutique" />
      <button type="submit">Guardar</button>
    </form>
  `)
  bindLogout(root)
  root.querySelector('#dev-settings')?.addEventListener('submit', (e) => {
    e.preventDefault()
    toast('Config guardada (local por ahora)', 'ok')
  })
}
