import { signIn, isDeveloper } from '../lib/auth.js'
import { toast } from '../lib/utils.js'

export function renderLogin(root) {
  root.innerHTML = `
    <div class="page auth-page">
      <a href="#/" class="back-link">← Volver</a>
      <form id="login-form" class="card auth-card">
        <img src="assets/logo.jpg" alt="" class="logo-sm" />
        <h1>Iniciar sesión</h1>
        <p class="muted">Accede al panel de Alany Boutique</p>
        <label class="label">Correo</label>
        <input type="email" name="email" class="input" required placeholder="correo@ejemplo.com" autocomplete="email" />
        <label class="label">Contraseña</label>
        <input type="password" name="password" class="input" required placeholder="••••••••" autocomplete="current-password" />
        <button type="submit" class="btn btn-primary btn-block" id="login-btn">Entrar</button>
      </form>
    </div>
  `

  const form = root.querySelector('#login-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = root.querySelector('#login-btn')
    btn.disabled = true
    btn.textContent = 'Entrando...'
    const fd = new FormData(form)
    try {
      await signIn(fd.get('email'), fd.get('password'))
      toast('Bienvenida', 'ok')
      location.hash = isDeveloper() ? '#/developer' : '#/dashboard'
    } catch (err) {
      toast(err.message || 'No se pudo iniciar sesión', 'error')
      btn.disabled = false
      btn.textContent = 'Entrar'
    }
  })
}
