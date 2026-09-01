import { icon } from '../lib/icons.js'
import { CONFIG } from '../lib/config.js'
import { getSession, isDeveloper } from '../lib/auth.js'

export function renderWelcome(root) {
  const session = getSession()
  if (session) {
    location.hash = isDeveloper() ? '#/developer' : '#/dashboard'
    return
  }

  root.innerHTML = `
    <div class="page welcome">
      <div class="welcome-card">
        <img src="assets/logo.jpg" alt="Alany Boutique" class="logo-lg" />
        <h1>${CONFIG.BUSINESS_NAME}</h1>
        <p class="tagline">${icon('sparkles', 16)} Moda que te hace brillar</p>
        <a href="#/login" class="btn btn-primary btn-block">Iniciar sesión</a>
        <a href="#/register" class="btn btn-ghost btn-block">Crear cuenta</a>
      </div>
    </div>
  `
}
