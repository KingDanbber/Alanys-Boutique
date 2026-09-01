import { icon } from '../lib/icons.js'

export function renderBottomNav(active = 'dashboard') {
  const items = [
    { id: 'dashboard', href: '#/dashboard', label: 'Inicio', name: 'home' },
    { id: 'productos', href: '#/productos', label: 'Productos', name: 'package' },
    { id: 'pedidos', href: '#/pedidos', label: 'Pedidos', name: 'shoppingBag' },
    { id: 'clientes', href: '#/clientes', label: 'Clientes', name: 'users' },
    { id: 'mas', href: '#/mas', label: 'Más', name: 'menu' },
  ]
  return `
    <nav class="bottom-nav">
      ${items.map((i) => `
        <a href="${i.href}" class="nav-item ${active === i.id ? 'active' : ''}">
          <span class="nav-icon">${icon(i.name, 22)}</span>
          <span class="nav-label">${i.label}</span>
        </a>
      `).join('')}
    </nav>
  `
}
