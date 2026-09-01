import { signUp } from '../lib/auth.js'
import { toast } from '../lib/utils.js'
import { icon } from '../lib/icons.js'

function bindPasswordToggle(root) {
  root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.password-wrap')
      const input = wrap?.querySelector('input')
      if (!input) return
      const show = input.type === 'password'
      input.type = show ? 'text' : 'password'
      btn.innerHTML = show ? icon('eyeOff', 20) : icon('eye', 20)
      btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Ver contraseña')
    })
  })
}

export function renderRegister(root) {
  root.innerHTML = `
    <div class="page auth-page">
      <a href="#/" class="back-link">${icon('arrowLeft', 18)} Volver</a>
      <form id="reg-form" class="card auth-card">
        <img src="assets/logo.jpg" alt="" class="logo-sm" />
        <h1>Crear cuenta</h1>
        <p class="muted">Escribe tu nombre para que quede registrado en cada venta y gasto</p>
        <label class="label">Nombre completo</label>
        <input type="text" name="full_name" class="input" required placeholder="Tu nombre" autocomplete="name" />
        <label class="label">Correo</label>
        <input type="email" name="email" class="input" required placeholder="correo@ejemplo.com" autocomplete="email" />
        <label class="label">Contraseña</label>
        <div class="password-wrap">
          <input type="password" name="password" class="input" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
          <button type="button" class="password-toggle" data-toggle-password aria-label="Ver contraseña">${icon('eye', 20)}</button>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="reg-btn">Registrarme</button>
      </form>
    </div>
  `

  bindPasswordToggle(root)

  const form = root.querySelector('#reg-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = root.querySelector('#reg-btn')
    btn.disabled = true
    btn.textContent = 'Creando...'
    const fd = new FormData(form)
    try {
      await signUp(fd.get('email'), fd.get('password'), fd.get('full_name'))
      toast('Cuenta creada. Revisa tu correo si pide confirmación.', 'ok')
      location.hash = '#/login'
    } catch (err) {
      toast(err.message || 'No se pudo registrar', 'error')
      btn.disabled = false
      btn.textContent = 'Registrarme'
    }
  })
}
