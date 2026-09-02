import { isDeveloper } from './auth.js'
import { icon } from './icons.js'

/** Barra superior para volver al panel Developer (solo rol developer) */
export function renderDevReturnBar() {
  if (!isDeveloper()) return ''
  return `
    <div class="dev-return-bar">
      <a href="#/developer" class="dev-return-btn">
        ${icon('terminal', 16)}
        <span>Volver a Developer</span>
      </a>
    </div>
  `
}
