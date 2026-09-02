/** Catálogo de tallas por público — boutique MX */
export const AUDIENCES = [
  { id: 'mujer', label: 'Mujer' },
  { id: 'hombre', label: 'Caballero' },
  { id: 'nino', label: 'Niño' },
  { id: 'nina', label: 'Niña' },
  { id: 'unisex', label: 'Unisex' },
]

export const SIZE_PRESETS = {
  mujer: [
    'CH', 'M', 'G', 'EG', 'Unitalla',
    '1', '3', '5', '7', '9', '11', '13', '15',
    'XS', 'S', 'L', 'XL',
  ],
  hombre: [
    'S', 'M', 'L', 'XL', 'XXL',
    '28', '30', '32', '34', '36', '38', '40',
  ],
  nino: ['2', '4', '6', '8', '10', '12', '14', 'Unitalla'],
  nina: ['2', '4', '6', '8', '10', '12', '14', 'Unitalla'],
  unisex: ['CH', 'M', 'G', 'S', 'M', 'L', 'XL', 'Unitalla'],
}

/** Normaliza sizes desde DB (objeto o null) */
export function normalizeSizes(sizes) {
  if (!sizes || typeof sizes !== 'object' || Array.isArray(sizes)) return {}
  const out = {}
  for (const [k, v] of Object.entries(sizes)) {
    const n = Number(v)
    if (n > 0) out[String(k)] = n
  }
  return out
}

export function sumSizes(sizes) {
  return Object.values(normalizeSizes(sizes)).reduce((a, b) => a + Number(b || 0), 0)
}

export function formatSizesShort(sizes) {
  const s = normalizeSizes(sizes)
  const keys = Object.keys(s)
  if (!keys.length) return ''
  return keys.map((k) => `${k}:${s[k]}`).join(' · ')
}
