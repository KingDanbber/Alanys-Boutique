import { CONFIG } from './config.js'

let client = null

export function getSupabase() {
  if (client) return client
  if (!window.supabase) {
    console.error('Supabase SDK no cargado')
    return null
  }
  client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  return client
}
