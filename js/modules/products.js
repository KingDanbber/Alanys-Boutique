import { getSupabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { formatMoney, toast, escapeHtml } from '../lib/utils.js'
import { uploadImage } from '../lib/cloudinary.js'
import { icon } from '../lib/icons.js'
import { renderDevReturnBar } from '../lib/dev-return.js'
import { renderBottomNav } from './nav.js'

const CATEGORIES = ['Blusas', 'Vestidos', 'Pantalones', 'Faldas', 'Accesorios', 'Calzado', 'Otro']
const TAGS = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Navideño', 'Escolar', 'Casual', 'Fiesta']

export async function renderProducts(root) {
  root.innerHTML = `
    <div class="page app-page">
      ${renderDevReturnBar()}
      <header class="topbar">
        <h1 class="topbar-title">Productos</h1>
        <button type="button" class="btn btn-primary btn-sm" id="btn-new-product">${icon('plus', 16)} Nuevo</button>
      </header>
      <div id="products-list" class="section">
        <p class="muted center">Cargando...</p>
      </div>
      ${renderBottomNav('productos')}
    </div>
  `

  root.querySelector('#btn-new-product')?.addEventListener('click', () => openProductForm(root))
  await loadProducts(root)
}

async function loadProducts(root) {
  const list = root.querySelector('#products-list')
  const profile = getProfile()
  const businessId = profile?.active_business_id
  const sb = getSupabase()

  if (!businessId) {
    list.innerHTML = `<p class="muted center">Sin negocio asignado. Configura tu perfil en el panel Developer.</p>`
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

  if (!data?.length) {
    list.innerHTML = `
      <div class="empty">
        <p>Aún no hay productos</p>
        <button type="button" class="btn btn-primary" id="btn-empty-new">Agregar el primero</button>
      </div>
    `
    root.querySelector('#btn-empty-new')?.addEventListener('click', () => openProductForm(root))
    return
  }

  list.innerHTML = data.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-img">
        ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="" />` : `<span class="no-img">${icon('shirt', 28)}</span>`}
      </div>
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="muted small">${escapeHtml(p.brand || '')} · ${escapeHtml(p.category || '')}</p>
        <p class="price">${formatMoney(p.sale_price)}</p>
        <p class="stock ${p.stock <= p.min_stock ? 'warn' : ''}">Stock: ${p.stock}</p>
      </div>
    </article>
  `).join('')
}

function openProductForm(root, product = null) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <header class="modal-header">
        <h2>${product ? 'Editar' : 'Nuevo'} producto</h2>
        <button type="button" class="icon-btn" id="modal-close">${icon('x', 20)}</button>
      </header>
      <form id="product-form" class="modal-body">
        <label class="label">Nombre prenda</label>
        <input name="name" class="input" required value="${escapeHtml(product?.name || '')}" />

        <label class="label">Marca</label>
        <input name="brand" class="input" value="${escapeHtml(product?.brand || '')}" />

        <label class="label">Tipo de ropa</label>
        <select name="category" class="input">
          ${CATEGORIES.map((c) => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <label class="label">Etiquetas</label>
        <div class="tags-wrap">
          ${TAGS.map((t) => {
            const checked = (product?.tags || []).includes(t)
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

        <div class="row-2">
          <div>
            <label class="label">Stock inicial</label>
            <input name="initial_stock" type="number" min="0" class="input" value="${product?.initial_stock ?? product?.stock ?? 0}" />
          </div>
          <div>
            <label class="label">Stock mínimo</label>
            <input name="min_stock" type="number" min="0" class="input" value="${product?.min_stock ?? 0}" />
          </div>
        </div>

        <label class="label">Imagen</label>
        <input name="image" type="file" accept="image/*" class="input" />
        ${product?.image_url ? `<img src="${escapeHtml(product.image_url)}" class="preview-img" />` : ''}

        <button type="submit" class="btn btn-primary btn-block" id="save-product">Guardar</button>
      </form>
    </div>
  `
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').onclick = close
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  overlay.querySelector('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = overlay.querySelector('#save-product')
    btn.disabled = true
    btn.textContent = 'Guardando...'
    const fd = new FormData(e.target)
    const profile = getProfile()
    const sb = getSupabase()

    try {
      let image_url = product?.image_url || null
      const file = fd.get('image')
      if (file && file.size > 0) {
        image_url = await uploadImage(file)
      }

      const tags = fd.getAll('tags')
      const stock = Number(fd.get('initial_stock') || 0)
      const payload = {
        business_id: profile.active_business_id,
        name: fd.get('name'),
        brand: fd.get('brand') || null,
        category: fd.get('category'),
        tags,
        cost_price: Number(fd.get('cost_price') || 0),
        sale_price: Number(fd.get('sale_price') || 0),
        initial_stock: stock,
        stock: product ? product.stock : stock,
        min_stock: Number(fd.get('min_stock') || 0),
        image_url,
        is_active: true,
      }

      if (product) {
        const { error } = await sb.from('products').update(payload).eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await sb.from('products').insert(payload)
        if (error) throw error
      }

      toast('Producto guardado', 'ok')
      close()
      await loadProducts(root)
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error')
      btn.disabled = false
      btn.textContent = 'Guardar'
    }
  })
}
