export function renderBottomNav(active = 'dashboard') {
  const items = [
    { id: 'dashboard', href: '#/dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'productos', href: '#/productos', label: 'Productos', icon: '📦' },
    { id: 'pedidos', href: '#/pedidos', label: 'Pedidos', icon: '🛍️' },
    { id: 'clientes', href: '#/clientes', label: 'Clientes', icon: '👥' },
    { id: 'mas', href: '#/mas', label: 'Más', icon: '☰' },
  ]
  return `
    <nav class="bottom-nav">
      ${items.map((i) => `
        <a href="${i.href}" class="nav-item ${active === i.id ? 'active' : ''}">
          <span class="nav-icon">${i.icon}</span>
          <span class="nav-label">${i.label}</span>
        </a>
      `).join('')}
    </nav>
  `
}
