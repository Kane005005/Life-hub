export type TerritoryCode = 'INT' | 'VIT' | 'INF' | 'TEC' | 'CRE' | 'SAG'

export type BrandColor = {
  id: string
  name: string
  hex: string
  role: string
}

export type Territory = {
  code: TerritoryCode
  name: string
  en: string
  hex: string
  glyph: string
}

export const BRAND_COLORS: readonly BrandColor[] = [
  { id: 'nuit', name: 'Nuit', hex: '#0B100E', role: 'Fond du monde.' },
  { id: 'charbon', name: 'Charbon', hex: '#16181A', role: 'Encre sur clair, fonds neutres.' },
  {
    id: 'vert-profond',
    name: 'Vert profond',
    hex: '#0B3D2E',
    role: 'Boss, surfaces fortes.',
  },
  { id: 'emeraude', name: 'Émeraude', hex: '#0F7B5A', role: 'Accent sur fond clair.' },
  {
    id: 'emeraude-vive',
    name: 'Émeraude vive',
    hex: '#2FD08B',
    role: 'La lumière du monde : XP, sélection, lueurs.',
  },
  { id: 'ivoire', name: 'Ivoire', hex: '#EDE9DF', role: 'Texte sur nuit, papier des documents.' },
  { id: 'argent', name: 'Argent', hex: '#B9BEC2', role: 'Cadres, filets, texte secondaire.' },
]

export const TERRITORIES: readonly Territory[] = [
  {
    code: 'INT',
    name: 'Savoir',
    en: 'KNOWLEDGE',
    hex: '#6F94B5',
    glyph: '<path d="M4 19 L12 5 L20 19 Z"/><circle cx="12" cy="14.5" r="1.6"/>',
  },
  {
    code: 'VIT',
    name: 'Corps',
    en: 'BODY',
    hex: '#2FD08B',
    glyph: '<path d="M3 12 H8 L10.5 6 L13.5 18 L16 12 H21"/>',
  },
  {
    code: 'INF',
    name: 'Carrière',
    en: 'CAREER',
    hex: '#D0A94A',
    glyph: '<path d="M4 19 H9 V14 H14 V9 H19 V4"/>',
  },
  {
    code: 'TEC',
    name: 'Technologie',
    en: 'TECHNOLOGY',
    hex: '#3FB6C6',
    glyph: '<path d="M8 6 L3 12 L8 18 M16 6 L21 12 L16 18 M13.5 5 L10.5 19"/>',
  },
  {
    code: 'CRE',
    name: 'Création',
    en: 'CREATION',
    hex: '#E0806F',
    glyph: '<path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z"/>',
  },
  {
    code: 'SAG',
    name: 'Monde intérieur',
    en: 'INNER WORLD',
    hex: '#A08DD0',
    glyph: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4"/>',
  },
]

export const MOTION = {
  ease: 'cubic-bezier(.2,.7,.2,1)',
  fast: 120,
  base: 240,
  slow: 600,
} as const
