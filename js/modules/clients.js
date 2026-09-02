import { getSupabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { toast, escapeHtml } from '../lib/utils.js'
import { icon } from '../lib/icons.js'
import { renderDevReturnBar } from '../lib/dev-return.js'
import { renderBottomNav } from './nav.js'

let searchQuery = ''

export async function renderClients(root) {
  root.innerHTML = `
    <div class="page app-page">
      ${renderDevReturnBar()}
      <header class="topbar">
        <h1 class="topbar-title">Clientes</h1>
        <button type="button" class="btn btn-primary btn-sm" id="btn-new-client">${icon('plus', 16)} Nuevo</button>
      </header>

      <div class="section">
        <div class="search-wrap">
          ${icon('search', 18)}
          <input type="search" id="client-search" class="input search-input" placeholder="Buscar por nombre o WhatsApp..." />
        </div>
      </div>

      <div id="clients-list" class="section">
        <p class="muted center">Cargando...</p>
      </div>
      ${renderBottomNav('clientes')}
    </div>
  `

  root.querySelector('#btn-new-client')?.addEventListener('click', () => openClientForm(root))
  root.querySelector('#client-search')?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').trim().toLowerCase()
    loadClients(root)
  })

  await loadClients(root)
}

async function loadClients(root) {
  const list = root.querySelector('#clients-list')
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  if (!businessId) {
    list.innerHTML = `<p class="muted center">Sin negocio asignado. Configura tu perfil en el panel Developer.</p>`
    return
  }

  const { data, error } = await sb
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    list.innerHTML = `<p class="error center">${escapeHtml(error.message)}</p>`
    return
  }

  let clients = data || []
  if (searchQuery) {
    clients = clients.filter((c) => {
      const name = (c.name || '').toLowerCase()
      const wa = (c.whatsapp || '').toLowerCase()
      return name.includes(searchQuery) || wa.includes(searchQuery)
    })
  }

  if (!clients.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${icon('users', 36)}</div>
        <p>${searchQuery ? 'Sin resultados' : 'Aún no hay clientes'}</p>
        ${!searchQuery ? `<button type="button" class="btn btn-primary" id="btn-empty-client">Agregar el primero</button>` : ''}
      </div>
    `
    root.querySelector('#btn-empty-client')?.addEventListener('click', () => openClientForm(root))
    return
  }

  list.innerHTML = clients.map((c) => {
    const wa = (c.whatsapp || '').replace(/\D/g, '')
    const waLink = wa ? `https://wa.me/52${wa.replace(/^52/, '')}` : ''
    return `
      <article class="client-card" data-id="${c.id}">
        <div class="client-avatar">${escapeHtml((c.name || '?').charAt(0).toUpperCase())}</div>
        <div class="client-body">
          <h3>${escapeHtml(c.name)}</h3>
          ${c.whatsapp ? `<p class="muted small">${escapeHtml(c.whatsapp)}</p>` : ''}
          ${c.address ? `<p class="muted small client-address">${escapeHtml(c.address)}</p>` : ''}
        </div>
        <div class="client-actions">
          ${waLink ? `<a class="icon-btn client-wa" href="${waLink}" target="_blank" rel="noopener" title="WhatsApp">${icon('phone', 18)}</a>` : ''}
          <button type="button" class="icon-btn btn-edit-client" data-id="${c.id}" title="Editar">${icon('pencil', 18)}</button>
          <button type="button" class="icon-btn btn-del-client danger" data-id="${c.id}" title="Eliminar">${icon('x', 18)}</button>
        </div>
      </article>
    `
  }).join('')

  // Better: use phone icon - we may not have phone in icons. Use users or a simple approach
  // Fix WhatsApp to use a clearer icon - shoppingBag is wrong. Let me use install or add phone path later.
  // For now sparkles is wrong - I'll add phone to icons or use a text WA

  list.querySelectorAll('.btn-edit-client').forEach((btn) => {
    btn.addEventListener('click', () => {
      const client = clients.find((c) => c.id === btn.dataset.id)
      if (client) openClientForm(root, client)
    })
  })

  list.querySelectorAll('.btn-del-client').forEach((btn) => {
    btn.addEventListener('click', () => confirmDelete(root, btn.dataset.id, clients))
  })
}

function openClientForm(root, client = null) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <header class="modal-header">
        <h2>${client ? 'Editar' : 'Nuevo'} cliente</h2>
        <button type="button" class="icon-btn" id="modal-close">${icon('x', 20)}</button>
      </header>
      <form id="client-form" class="modal-body">
        <label class="label">Nombre completo *</label>
        <input name="name" class="input" required value="${escapeHtml(client?.name || '')}" placeholder="Nombre del cliente" />

        <label class="label">WhatsApp</label>
        <input name="whatsapp" class="input" type="tel" inputmode="tel" value="${escapeHtml(client?.whatsapp || '')}" placeholder="8711234567" />

        <label class="label">Dirección</label>
        <input name="address" class="input" value="${escapeHtml(client?.address || '')}" placeholder="Calle, colonia, ciudad" />

        <label class="label">Notas</label>
        <textarea name="notes" class="input textarea" rows="3" placeholder="Preferencias, tallas, comentarios...">${escapeHtml(client?.notes || '')}</textarea>

        <button type="submit" class="btn btn-primary btn-block" id="save-client">Guardar</button>
      </form>
    </div>
  `
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').onclick = close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  overlay.querySelector('#client-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = overlay.querySelector('#save-client')
    btn.disabled = true
    btn.textContent = 'Guardando...'
    const fd = new FormData(e.target)
    const profile = getProfile()
    const sb = getSupabase()

    const payload = {
      business_id: profile.active_business_id,
      name: String(fd.get('name') || '').trim(),
      whatsapp: String(fd.get('whatsapp') || '').trim() || null,
      address: String(fd.get('address') || '').trim() || null,
      notes: String(fd.get('notes') || '').trim() || null,
      is_active: true,
    }

    try {
      if (client) {
        const { error } = await sb.from('clients').update(payload).eq('id', client.id)
        if (error) throw error
      } else {
        const { error } = await sb.from('clients').insert(payload)
        if (error) throw error
      }
      toast(client ? 'Cliente actualizado' : 'Cliente agregado', 'ok')
      close()
      await loadClients(root)
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
      btn.disabled = false
      btn.textContent = 'Guardar'
    }
  })
}

async function confirmDelete(root, id, clients) {
  const client = clients.find((c) => c.id === id)
  const name = client?.name || 'este cliente'
  if (!confirm(`¿Eliminar a ${name}?`)) return

  const sb = getSupabase()
  // Soft delete
  const { error } = await sb.from('clients').update({ is_active: false }).eq('id', id)
  if (error) {
    toast(error.message || 'No se pudo eliminar', 'error')
    return
  }
  toast('Cliente eliminado', 'ok')
  await loadClients(root)
}
