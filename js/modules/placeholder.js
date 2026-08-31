import { renderBottomNav } from './nav.js'

export function renderPlaceholder(root, title, navId) {
  root.innerHTML = `
    <div class="page app-page">
      <header class="topbar">
        <h1 class="topbar-title">${title}</h1>
      </header>
      <div class="section empty">
        <p>Próximamente</p>
        <p class="muted small">Este módulo se activará en la siguiente etapa</p>
      </div>
      ${renderBottomNav(navId)}
    </div>
  `
}
