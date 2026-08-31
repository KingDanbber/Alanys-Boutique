import { getSupabase } from './supabase.js'

let session = null
let profile = null

export function getSession() {
  return session
}

export function getProfile() {
  return profile
}

export function isDeveloper() {
  return profile?.role === 'developer'
}

export function isAdmin() {
  return profile?.role === 'admin' || profile?.role === 'staff'
}

async function loadProfile(userId) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('profile error', error.message)
    profile = null
    return null
  }
  profile = data
  return profile
}

export async function initAuth() {
  const sb = getSupabase()
  if (!sb) return null

  const { data } = await sb.auth.getSession()
  session = data.session
  if (session?.user) {
    await loadProfile(session.user.id)
  }

  sb.auth.onAuthStateChange(async (_event, s) => {
    session = s
    if (s?.user) {
      await loadProfile(s.user.id)
    } else {
      profile = null
    }
  })

  return { session, profile }
}

export async function signIn(email, password) {
  const sb = getSupabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  session = data.session
  if (data.user) await loadProfile(data.user.id)
  return { session, profile }
}

export async function signUp(email, password, fullName) {
  const sb = getSupabase()
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'admin' },
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const sb = getSupabase()
  await sb.auth.signOut()
  session = null
  profile = null
}
