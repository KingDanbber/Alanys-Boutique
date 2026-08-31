export function $(sel, root = document) {
  return root.querySelector(sel)
}

export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)]
}

export function formatMoney(n = 0) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(n) || 0)
}

export function formatDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d))
}

export function toast(msg, type = 'info') {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    document.body.appendChild(el)
  }
  el.className = `toast toast-${type} show`
  el.textContent = msg
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2800)
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
