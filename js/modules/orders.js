import { getSupabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { formatMoney, formatDate, toast, escapeHtml } from '../lib/utils.js'
import { icon } from '../lib/icons.js'
import { renderDevReturnBar } from '../lib/dev-return.js'
import { renderBottomNav } from './nav.js'

const STATUSES = [
  { id: 'pendiente', label: 'Pendiente', color: 'st-pending' },
  { id: 'en_proceso', label: 'En proceso', color: 'st-process' },
  { id: 'entregado', label: 'Entregado', color: 'st-done' },
  { id: 'pagado', label: 'Pagado', color: 'st-paid' },
  { id: 'cancelado', label: 'Cancelado', color: 'st-cancel' },
]

function statusMeta(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0]
}

export async function renderOrders(root) {
  root.innerHTML = `
    <div class="page app-page">
      ${renderDevReturnBar()}
      <header class="topbar">
        <h1 class="topbar-title">Pedidos</h1>
        <button type="button" class="btn btn-primary btn-sm" id="btn-new-order">${icon('plus', 16)} Nuevo</button>
      </header>
      <div class="section status-filters" id="status-filters">
        <button type="button" class="chip active" data-status="">Todos</button>
        ${STATUSES.map((s) => `<button type="button" class="chip" data-status="${s.id}">${s.label}</button>`).join('')}
      </div>
      <div id="orders-list" class="section">
        <p class="muted center">Cargando...</p>
      </div>
      ${renderBottomNav('pedidos')}
    </div>
  `

  let filterStatus = ''
  root.querySelector('#btn-new-order')?.addEventListener('click', () => openOrderWizard(root))
  root.querySelectorAll('#status-filters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('#status-filters .chip').forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      filterStatus = chip.dataset.status || ''
      loadOrders(root, filterStatus)
    })
  })

  await loadOrders(root, filterStatus)
}

async function loadOrders(root, filterStatus = '') {
  const list = root.querySelector('#orders-list')
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  if (!businessId) {
    list.innerHTML = `<p class="muted center">Sin negocio asignado.</p>`
    return
  }

  let q = sb
    .from('orders')
    .select('*, clients(name, whatsapp), profiles:seller_id(full_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (filterStatus) q = q.eq('status', filterStatus)

  const { data, error } = await q
  if (error) {
    list.innerHTML = `<p class="error center">${escapeHtml(error.message)}</p>`
    return
  }

  if (!data?.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${icon('shoppingBag', 36)}</div>
        <p>Aún no hay pedidos</p>
        <button type="button" class="btn btn-primary" id="btn-empty-order">Crear el primero</button>
      </div>
    `
    root.querySelector('#btn-empty-order')?.addEventListener('click', () => openOrderWizard(root))
    return
  }

  list.innerHTML = data.map((o) => {
    const st = statusMeta(o.status)
    const clientName = o.clients?.name || 'Cliente'
    const seller = o.profiles?.full_name || '—'
    return `
      <article class="order-card" data-id="${o.id}">
        <div class="order-top">
          <div>
            <p class="order-num">#${o.order_number || '—'}</p>
            <h3>${escapeHtml(clientName)}</h3>
            <p class="muted small">${formatDate(o.created_at)} · ${escapeHtml(seller)}</p>
          </div>
          <span class="status-badge ${st.color}">${st.label}</span>
        </div>
        <div class="order-bottom">
          <span class="order-total">${formatMoney(o.total_sale)}</span>
          <span class="muted small">Ganancia ${formatMoney(o.total_profit)}</span>
          <button type="button" class="btn btn-ghost btn-sm btn-order-detail" data-id="${o.id}">Ver</button>
        </div>
      </article>
    `
  }).join('')

  list.querySelectorAll('.btn-order-detail').forEach((btn) => {
    btn.addEventListener('click', () => openOrderDetail(root, btn.dataset.id, filterStatus))
  })
}

async function openOrderDetail(root, orderId, filterStatus) {
  const sb = getSupabase()
  const { data: order, error } = await sb
    .from('orders')
    .select('*, clients(name, whatsapp), profiles:seller_id(full_name), order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    toast(error?.message || 'No se encontró el pedido', 'error')
    return
  }

  const st = statusMeta(order.status)
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <header class="modal-header">
        <h2>Pedido #${order.order_number || ''}</h2>
        <button type="button" class="icon-btn" id="modal-close">${icon('x', 20)}</button>
      </header>
      <div class="modal-body">
        <p><strong>${escapeHtml(order.clients?.name || 'Cliente')}</strong></p>
        <p class="muted small">${formatDate(order.created_at)} · Vende: ${escapeHtml(order.profiles?.full_name || '—')}</p>
        <p class="status-badge ${st.color}" style="display:inline-block;margin:8px 0">${st.label}</p>

        <div class="order-items-list">
          ${(order.order_items || []).map((it) => `
            <div class="order-item-row">
              <span>${escapeHtml(it.product_name)} × ${it.quantity}</span>
              <strong>${formatMoney(it.sale_price * it.quantity)}</strong>
            </div>
          `).join('')}
        </div>

        <div class="order-totals">
          <div><span>Venta</span><strong>${formatMoney(order.total_sale)}</strong></div>
          <div><span>Costo</span><strong>${formatMoney(order.total_cost)}</strong></div>
          <div><span>Ganancia</span><strong class="text-brand">${formatMoney(order.total_profit)}</strong></div>
        </div>

        ${order.notes ? `<p class="muted small">Notas: ${escapeHtml(order.notes)}</p>` : ''}

        <label class="label">Cambiar estatus</label>
        <select id="order-status" class="input">
          ${STATUSES.map((s) => `<option value="${s.id}" ${order.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-primary btn-block" id="btn-save-status">Actualizar estatus</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').onclick = close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  overlay.querySelector('#btn-save-status').onclick = async () => {
    const next = overlay.querySelector('#order-status').value
    const btn = overlay.querySelector('#btn-save-status')
    btn.disabled = true
    try {
      // Si cancela y antes no estaba cancelado → reponer stock
      if (next === 'cancelado' && order.status !== 'cancelado') {
        await restoreStock(order)
      }
      const { error: upErr } = await sb.from('orders').update({ status: next }).eq('id', order.id)
      if (upErr) throw upErr
      toast('Estatus actualizado', 'ok')
      close()
      await loadOrders(root, filterStatus)
    } catch (err) {
      toast(err.message || 'Error', 'error')
      btn.disabled = false
    }
  }
}

async function restoreStock(order) {
  const sb = getSupabase()
  const profile = getProfile()
  for (const it of order.order_items || []) {
    if (!it.product_id) continue
    const { data: prod } = await sb.from('products').select('stock').eq('id', it.product_id).single()
    if (!prod) continue
    const after = (prod.stock || 0) + it.quantity
    await sb.from('products').update({ stock: after }).eq('id', it.product_id)
    await sb.from('inventory_movements').insert({
      business_id: order.business_id,
      user_id: profile?.id,
      product_id: it.product_id,
      movement_type: 'entrada',
      quantity: it.quantity,
      stock_before: prod.stock,
      stock_after: after,
      reference_type: 'order',
      reference_id: order.id,
      notes: 'Reposición por cancelación de pedido',
    })
  }
}

async function openOrderWizard(root) {
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  if (!businessId) {
    toast('Sin negocio asignado', 'error')
    return
  }

  const [{ data: clients }, { data: products }] = await Promise.all([
    sb.from('clients').select('id, name, whatsapp').eq('business_id', businessId).eq('is_active', true).order('name'),
    sb.from('products').select('id, name, sale_price, cost_price, stock, image_url').eq('business_id', businessId).eq('is_active', true).order('name'),
  ])

  if (!clients?.length) {
    toast('Primero agrega un cliente', 'error')
    return
  }
  if (!products?.length) {
    toast('Primero agrega productos', 'error')
    return
  }

  const cart = [] // { product_id, product_name, quantity, sale_price, cost_price, max }

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal modal-tall">
      <header class="modal-header">
        <h2>Nuevo pedido</h2>
        <button type="button" class="icon-btn" id="modal-close">${icon('x', 20)}</button>
      </header>
      <div class="modal-body">
        <label class="label">Cliente *</label>
        <select id="order-client" class="input" required>
          <option value="">Seleccionar...</option>
          ${clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.whatsapp ? ' · ' + escapeHtml(c.whatsapp) : ''}</option>`).join('')}
        </select>

        <label class="label">Agregar producto</label>
        <div class="add-product-row">
          <select id="order-product" class="input">
            ${products.map((p) => `<option value="${p.id}" data-name="${escapeHtml(p.name)}" data-sale="${p.sale_price}" data-cost="${p.cost_price}" data-stock="${p.stock}">${escapeHtml(p.name)} · ${formatMoney(p.sale_price)} · Stock ${p.stock}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="btn-add-line">${icon('plus', 16)}</button>
        </div>

        <div id="cart-list" class="cart-list">
          <p class="muted small center">Sin productos aún</p>
        </div>

        <div class="order-totals" id="cart-totals">
          <div><span>Venta</span><strong>$0</strong></div>
          <div><span>Costo</span><strong>$0</strong></div>
          <div><span>Ganancia</span><strong class="text-brand">$0</strong></div>
        </div>

        <label class="label">Notas</label>
        <textarea id="order-notes" class="input textarea" rows="2" placeholder="Opcional"></textarea>

        <button type="button" class="btn btn-primary btn-block" id="btn-save-order">Crear pedido</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').onclick = close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  function renderCart() {
    const box = overlay.querySelector('#cart-list')
    if (!cart.length) {
      box.innerHTML = `<p class="muted small center">Sin productos aún</p>`
    } else {
      box.innerHTML = cart.map((line, idx) => `
        <div class="cart-line">
          <div class="cart-line-info">
            <strong>${escapeHtml(line.product_name)}</strong>
            <span class="muted small">${formatMoney(line.sale_price)} c/u</span>
          </div>
          <div class="cart-line-qty">
            <button type="button" class="qty-btn" data-idx="${idx}" data-delta="-1">−</button>
            <span>${line.quantity}</span>
            <button type="button" class="qty-btn" data-idx="${idx}" data-delta="1">+</button>
          </div>
          <strong class="cart-line-total">${formatMoney(line.sale_price * line.quantity)}</strong>
          <button type="button" class="icon-btn danger qty-remove" data-idx="${idx}">${icon('trash', 16)}</button>
        </div>
      `).join('')
    }

    const sale = cart.reduce((s, l) => s + l.sale_price * l.quantity, 0)
    const cost = cart.reduce((s, l) => s + l.cost_price * l.quantity, 0)
    overlay.querySelector('#cart-totals').innerHTML = `
      <div><span>Venta</span><strong>${formatMoney(sale)}</strong></div>
      <div><span>Costo</span><strong>${formatMoney(cost)}</strong></div>
      <div><span>Ganancia</span><strong class="text-brand">${formatMoney(sale - cost)}</strong></div>
    `

    box.querySelectorAll('.qty-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx)
        const d = Number(b.dataset.delta)
        const line = cart[i]
        const next = line.quantity + d
        if (next < 1) return
        if (next > line.max) {
          toast(`Stock máximo: ${line.max}`, 'error')
          return
        }
        line.quantity = next
        renderCart()
      })
    })
    box.querySelectorAll('.qty-remove').forEach((b) => {
      b.addEventListener('click', () => {
        cart.splice(Number(b.dataset.idx), 1)
        renderCart()
      })
    })
  }

  overlay.querySelector('#btn-add-line').onclick = () => {
    const sel = overlay.querySelector('#order-product')
    const opt = sel.selectedOptions[0]
    if (!opt) return
    const id = opt.value
    const max = Number(opt.dataset.stock) || 0
    if (max < 1) {
      toast('Sin stock de este producto', 'error')
      return
    }
    const existing = cart.find((l) => l.product_id === id)
    if (existing) {
      if (existing.quantity + 1 > max) {
        toast(`Stock máximo: ${max}`, 'error')
        return
      }
      existing.quantity += 1
    } else {
      cart.push({
        product_id: id,
        product_name: opt.dataset.name,
        quantity: 1,
        sale_price: Number(opt.dataset.sale) || 0,
        cost_price: Number(opt.dataset.cost) || 0,
        max,
      })
    }
    renderCart()
  }

  overlay.querySelector('#btn-save-order').onclick = async () => {
    const clientId = overlay.querySelector('#order-client').value
    if (!clientId) {
      toast('Selecciona un cliente', 'error')
      return
    }
    if (!cart.length) {
      toast('Agrega al menos un producto', 'error')
      return
    }

    const btn = overlay.querySelector('#btn-save-order')
    btn.disabled = true
    btn.textContent = 'Guardando...'

    const total_sale = cart.reduce((s, l) => s + l.sale_price * l.quantity, 0)
    const total_cost = cart.reduce((s, l) => s + l.cost_price * l.quantity, 0)
    const notes = overlay.querySelector('#order-notes').value.trim() || null

    try {
      // Re-check stock
      for (const line of cart) {
        const { data: prod } = await sb.from('products').select('stock, name').eq('id', line.product_id).single()
        if (!prod || prod.stock < line.quantity) {
          throw new Error(`Stock insuficiente: ${prod?.name || line.product_name}`)
        }
      }

      const { data: order, error: orderErr } = await sb
        .from('orders')
        .insert({
          business_id: businessId,
          client_id: clientId,
          seller_id: profile.id,
          status: 'pendiente',
          total_sale,
          total_cost,
          total_profit: total_sale - total_cost,
          notes,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const items = cart.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        sale_price: l.sale_price,
        cost_price: l.cost_price,
      }))

      const { error: itemsErr } = await sb.from('order_items').insert(items)
      if (itemsErr) throw itemsErr

      // Descontar stock + movimientos
      for (const line of cart) {
        const { data: prod } = await sb.from('products').select('stock').eq('id', line.product_id).single()
        const before = prod?.stock || 0
        const after = before - line.quantity
        await sb.from('products').update({ stock: after }).eq('id', line.product_id)
        await sb.from('inventory_movements').insert({
          business_id: businessId,
          user_id: profile.id,
          product_id: line.product_id,
          movement_type: 'salida',
          quantity: line.quantity,
          stock_before: before,
          stock_after: after,
          reference_type: 'order',
          reference_id: order.id,
          notes: 'Venta',
        })
      }

      toast('Pedido creado', 'ok')
      close()
      await loadOrders(root, '')
    } catch (err) {
      toast(err.message || 'Error al crear pedido', 'error')
      btn.disabled = false
      btn.textContent = 'Crear pedido'
    }
  }
}
