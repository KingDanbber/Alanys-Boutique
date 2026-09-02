import { getSupabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { formatMoney, toast, escapeHtml } from '../lib/utils.js'
import { uploadImage } from '../lib/cloudinary.js'
import { icon } from '../lib/icons.js'
import { AUDIENCES, SIZE_PRESETS, normalizeSizes, sumSizes, formatSizesShort } from '../lib/sizes.js'
import { renderDevReturnBar } from '../lib/dev-return.js'
import { renderBottomNav } from './nav.js'

const CATEGORIES = ['Blusas', 'Vestidos', 'Pantalones', 'Faldas', 'Shorts', 'Conjuntos', 'Tops', 'Accesorios', 'Calzado', 'Otro']
const TAGS = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Navideño', 'Escolar', 'Casual', 'Fiesta', 'Deportivo']

let searchQuery = ''
let filterCategory = ''
let allProducts = []

export async function renderProducts(root) {
  root.innerHTML = `
    <div class="page app-page">
      ${renderDevReturnBar()}
      <header class="topbar">
        <h1 class="topbar-title">Productos</h1>
        <button type="button" class="btn btn-primary btn-sm" id="btn-new-product">${icon('plus', 16)} Nuevo</button>
      </header>

      <div class="section">
        <div class="search-wrap">
          ${icon('search', 18)}
          <input type="search" id="product-search" class="input search-input" placeholder="Buscar nombre o marca..." />
        </div>
        <div class="status-filters" id="cat-filters" style="margin-top:10px">
          <button type="button" class="chip active" data-cat="">Todos</button>
          ${CATEGORIES.map((c) => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <div id="products-list" class="section">
        <p class="muted center">Cargando...</p>
      </div>
      ${renderBottomNav('productos')}
    </div>
  `

  root.querySelector('#btn-new-product')?.addEventListener('click', () => openProductForm(root))
  root.querySelector('#product-search')?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').trim().toLowerCase()
    renderList(root)
  })
  root.querySelectorAll('#cat-filters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('#cat-filters .chip').forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      filterCategory = chip.dataset.cat || ''
      renderList(root)
    })
  })

  await loadProducts(root)
}

async function loadProducts(root) {
  const list = root.querySelector('#products-list')
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  if (!businessId) {
    list.innerHTML = `<p class="muted center">Sin negocio asignado.</p>`
    return
  }

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    list.innerHTML = `<p class="error center">${escapeHtml(error.message)}</p>`
    return
  }

  allProducts = data || []
  renderList(root)
}

function renderList(root) {
  const list = root.querySelector('#products-list')
  let items = allProducts

  if (filterCategory) items = items.filter((p) => p.category === filterCategory)
  if (searchQuery) {
    items = items.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const brand = (p.brand || '').toLowerCase()
      return name.includes(searchQuery) || brand.includes(searchQuery)
    })
  }

  if (!items.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${icon('package', 36)}</div>
        <p>${searchQuery || filterCategory ? 'Sin resultados' : 'Aún no hay productos'}</p>
        ${!searchQuery && !filterCategory ? `<button type="button" class="btn btn-primary" id="btn-empty-new">Agregar el primero</button>` : ''}
      </div>
    `
    root.querySelector('#btn-empty-new')?.addEventListener('click', () => openProductForm(root))
    return
  }

  list.innerHTML = items.map((p) => {
    const sizes = normalizeSizes(p.sizes)
    const stock = Object.keys(sizes).length ? sumSizes(sizes) : Number(p.stock || 0)
    const low = stock <= Number(p.min_stock || 0)
    const sizeTxt = formatSizesShort(sizes)
    const tags = (p.tags || []).slice(0, 3)
    const aud = AUDIENCES.find((a) => a.id === p.audience)?.label || ''
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-img">
          ${p.image_url
            ? `<img src="${escapeHtml(p.image_url)}" alt="" loading="lazy" />`
            : `<span class="no-img">${icon('shirt', 28)}</span>`}
        </div>
        <div class="product-body">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="muted small">${escapeHtml(p.brand || '—')} · ${escapeHtml(p.category || '')}${aud ? ' · ' + aud : ''}</p>
          <p class="price">${formatMoney(p.sale_price)}</p>
          <p class="stock ${low ? 'warn' : ''}">Stock: ${stock}${low ? ' · Bajo' : ''}</p>
          ${sizeTxt ? `<p class="muted small sizes-line">${escapeHtml(sizeTxt)}</p>` : ''}
          ${tags.length ? `<div class="product-tags">${tags.map((t) => `<span class="mini-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="product-actions">
          <button type="button" class="icon-btn btn-edit-product" data-id="${p.id}">${icon('pencil', 18)}</button>
          <button type="button" class="icon-btn danger btn-del-product" data-id="${p.id}">${icon('trash', 18)}</button>
        </div>
      </article>
    `
  }).join('')

  list.querySelectorAll('.btn-edit-product').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const product = allProducts.find((x) => x.id === btn.dataset.id)
      if (product) openProductForm(root, product)
    })
  })
  list.querySelectorAll('.btn-del-product').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      confirmDelete(root, btn.dataset.id)
    })
  })
}

function renderSizeGrid(audience, currentSizes = {}) {
  const presets = SIZE_PRESETS[audience] || SIZE_PRESETS.mujer
  const sizes = normalizeSizes(currentSizes)
  // include any custom keys already stored
  const extra = Object.keys(sizes).filter((k) => !presets.includes(k))
  const all = [...presets, ...extra]

  return `
    <div class="size-grid" id="size-grid">
      ${all.map((sz) => {
        const qty = sizes[sz] || 0
        const on = qty > 0
        return `
          <div class="size-cell ${on ? 'on' : ''}" data-size="${escapeHtml(sz)}">
            <span class="size-label">${escapeHtml(sz)}</span>
            <input type="number" min="0" class="size-qty input" data-size="${escapeHtml(sz)}" value="${qty}" inputmode="numeric" />
          </div>
        `
      }).join('')}
    </div>
    <p class="muted small" id="size-total">Stock total: ${sumSizes(sizes)}</p>
  `
}

function readSizesFromForm(form) {
  const sizes = {}
  form.querySelectorAll('.size-qty').forEach((input) => {
    const n = Number(input.value || 0)
    if (n > 0) sizes[input.dataset.size] = n
  })
  return sizes
}

function openProductForm(root, product = null) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  const currentTags = product?.tags || []
  let audience = product?.audience || 'mujer'
  const currentSizes = normalizeSizes(product?.sizes)

  overlay.innerHTML = `
    <div class="modal modal-tall">
      <header class="modal-header">
        <h2>${product ? 'Editar' : 'Nuevo'} producto</h2>
        <button type="button" class="icon-btn" id="modal-close">${icon('x', 20)}</button>
      </header>
      <form id="product-form" class="modal-body">
        <label class="label">Nombre prenda *</label>
        <input name="name" class="input" required value="${escapeHtml(product?.name || '')}" placeholder="Ej. Skinny, Push up, Short..." />

        <label class="label">Marca</label>
        <input name="brand" class="input" value="${escapeHtml(product?.brand || '')}" placeholder="Marca" />

        <label class="label">Tipo de ropa</label>
        <select name="category" class="input">
          ${CATEGORIES.map((c) => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <label class="label">Público</label>
        <select name="audience" id="product-audience" class="input">
          ${AUDIENCES.map((a) => `<option value="${a.id}" ${audience === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}
        </select>

        <label class="label">Tallas y cantidades</label>
        <p class="muted small">Pon cantidad solo en las tallas que sí tienes</p>
        <div id="sizes-box">${renderSizeGrid(audience, currentSizes)}</div>

        <label class="label">Etiquetas</label>
        <div class="tags-wrap">
          ${TAGS.map((t) => {
            const checked = currentTags.includes(t)
            return `<label class="tag-chip"><input type="checkbox" name="tags" value="${t}" ${checked ? 'checked' : ''}/> ${t}</label>`
          }).join('')}
        </div>

        <div class="row-2">
          <div>
            <label class="label">Precio compra</label>
            <input name="cost_price" type="number" step="0.01" min="0" class="input" value="${product?.cost_price ?? 0}" />
          </div>
          <div>
            <label class="label">Precio venta</label>
            <input name="sale_price" type="number" step="0.01" min="0" class="input" value="${product?.sale_price ?? 0}" />
          </div>
        </div>

        <label class="label">Stock mínimo (alerta)</label>
        <input name="min_stock" type="number" min="0" class="input" value="${product?.min_stock ?? 0}" />

        <label class="label">Imagen</label>
        <input name="image" type="file" accept="image/*" class="input" id="product-image-input" />
        <div id="image-preview-box">
          ${product?.image_url ? `
            <img src="${escapeHtml(product.image_url)}" class="preview-img" />
            <button type="button" class="btn btn-ghost btn-sm" id="btn-remove-image">${icon('trash', 14)} Quitar imagen</button>
          ` : ''}
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="save-product">Guardar</button>
      </form>
    </div>
  `
  document.body.appendChild(overlay)

  let removeImage = false
  const form = overlay.querySelector('#product-form')
  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').onclick = close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  function bindSizeInputs() {
    form.querySelectorAll('.size-qty').forEach((input) => {
      input.addEventListener('input', () => {
        const cell = input.closest('.size-cell')
        const n = Number(input.value || 0)
        cell?.classList.toggle('on', n > 0)
        const total = sumSizes(readSizesFromForm(form))
        const el = form.querySelector('#size-total')
        if (el) el.textContent = `Stock total: ${total}`
      })
    })
  }
  bindSizeInputs()

  form.querySelector('#product-audience')?.addEventListener('change', (e) => {
    audience = e.target.value
    const prev = readSizesFromForm(form)
    form.querySelector('#sizes-box').innerHTML = renderSizeGrid(audience, prev)
    bindSizeInputs()
  })

  overlay.querySelector('#btn-remove-image')?.addEventListener('click', () => {
    removeImage = true
    const box = overlay.querySelector('#image-preview-box')
    if (box) box.innerHTML = `<p class="muted small">Imagen se quitará al guardar</p>`
    const input = overlay.querySelector('#product-image-input')
    if (input) input.value = ''
  })

  overlay.querySelector('#product-image-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    removeImage = false
    const url = URL.createObjectURL(file)
    overlay.querySelector('#image-preview-box').innerHTML = `<img src="${url}" class="preview-img" />`
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = overlay.querySelector('#save-product')
    btn.disabled = true
    btn.textContent = 'Guardando...'
    const fd = new FormData(form)
    const profile = getProfile()
    const sb = getSupabase()
    const sizes = readSizesFromForm(form)
    const stockTotal = sumSizes(sizes)

    try {
      let image_url = product?.image_url || null
      if (removeImage) image_url = null
      const file = fd.get('image')
      if (file && file.size > 0) image_url = await uploadImage(file)

      const payload = {
        business_id: profile.active_business_id,
        name: String(fd.get('name') || '').trim(),
        brand: String(fd.get('brand') || '').trim() || null,
        category: fd.get('category') || 'Otro',
        audience: fd.get('audience') || 'mujer',
        tags: fd.getAll('tags'),
        sizes,
        cost_price: Number(fd.get('cost_price') || 0),
        sale_price: Number(fd.get('sale_price') || 0),
        stock: stockTotal,
        min_stock: Number(fd.get('min_stock') || 0),
        image_url,
        is_active: true,
      }
      if (!product) payload.initial_stock = stockTotal

      if (product) {
        const { error } = await sb.from('products').update(payload).eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await sb.from('products').insert(payload)
        if (error) throw error
      }

      toast(product ? 'Producto actualizado' : 'Producto guardado', 'ok')
      close()
      await loadProducts(root)
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
      btn.disabled = false
      btn.textContent = 'Guardar'
    }
  })
}

async function confirmDelete(root, id) {
  const product = allProducts.find((p) => p.id === id)
  if (!confirm(`¿Eliminar "${product?.name || 'este producto'}"?`)) return
  const sb = getSupabase()
  const { error } = await sb.from('products').update({ is_active: false }).eq('id', id)
  if (error) return toast(error.message || 'No se pudo eliminar', 'error')
  toast('Producto eliminado', 'ok')
  await loadProducts(root)
}
