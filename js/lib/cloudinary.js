import { CONFIG } from './config.js'

export async function uploadImage(file) {
  const url = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET)

  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Error al subir imagen')
  const data = await res.json()
  return data.secure_url
}
