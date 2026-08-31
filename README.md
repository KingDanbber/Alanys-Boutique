# Alany Boutique · Admin (HTML / CSS / JS)

Aplicación web administrativa **simple y modular** — sin React, sin npm, sin build.

Ideal para editar desde el celular.

## Stack

- HTML + CSS + JavaScript (ES Modules)
- Supabase (CDN)
- Cloudinary (upload de imágenes)
- PWA instalable (`manifest.json` + `sw.js`)

## Estructura

```
alany-html/
  index.html
  css/styles.css
  js/
    app.js              ← router principal
    lib/
      config.js         ← CREDENCIALES AQUÍ
      supabase.js
      auth.js
      cloudinary.js
      utils.js
    modules/
      welcome.js
      login.js
      register.js
      dashboard.js
      products.js
      developer.js
      nav.js
  assets/logo.jpg
  icons/
  manifest.json
  sw.js
```

## Cómo configurar (1 minuto)

1. Abre `js/lib/config.js`
2. Pon tus datos de Supabase y Cloudinary:

```js
export const CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  CLOUDINARY_CLOUD_NAME: 'tu_cloud',
  CLOUDINARY_UPLOAD_PRESET: 'alany_boutique',
  BUSINESS_NAME: 'Alany Boutique',
  WHATSAPP: '8716079531',
  FACEBOOK: 'Alany boutique',
}
```

## Subir a GitHub + Vercel

1. Sube **toda la carpeta** a un repo de GitHub
2. En Vercel → Import Project
3. Framework Preset: **Other**
4. Build Command: (vacío)
5. Output Directory: `.` (o déjalo vacío)
6. Deploy

No hace falta `npm install`.

## PWA

Tras el deploy (HTTPS), en el celular:
- Android Chrome → Instalar app
- iPhone Safari → Compartir → Añadir a pantalla de inicio

## Roles

| Rol | Ruta |
|-----|------|
| developer | `#/developer` |
| admin / staff | `#/dashboard` |

## Schema SQL

Usa el schema que ya corriste en Supabase (tablas profiles, products, etc.).
