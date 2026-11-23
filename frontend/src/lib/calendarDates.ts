/** Calculs d'affichage des grilles du calendrier. Aucune règle de jeu ici. */

const WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

function padded(value: number): string {
  return String(value).padStart(2, '0')
}

export function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${padded(date.getMonth() + 1)}-${padded(date.getDate())}`
}

/** Midi local : évite qu'un changement d'heure décale le jour affiché. */
export function dateFromIso(iso: string): Date | null {
  const match = ISO_DAY.exec(iso)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function isValidIso(iso: string | null): iso is string {
  return iso !== null && dateFromIso(iso) !== null
}

export function todayIso(): string {
  return isoFromDate(new Date())
}

export function addDays(iso: string, days: number): string {
  const date = dateFromIso(iso) ?? new Date()
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}

export function startOfWeek(iso: string): string {
  const date = dateFromIso(iso) ?? new Date()
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return isoFromDate(date)
}

export function weekDates(iso: string): string[] {
  const monday = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function eachDate(from: string, to: string, limit = 100): string[] {
  const dates: string[] = []
  let cursor = from
  while (cursor <= to && dates.length < limit) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function shiftMonth(iso: string, months: number): string {
  const date = dateFromIso(iso) ?? new Date()
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate()
  date.setDate(Math.min(day, lastDay))
  return isoFromDate(date)
}

export function monthGrid(iso: string): string[] {
  const anchor = dateFromIso(iso) ?? new Date()
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12)
  const firstIso = isoFromDate(first)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate()
  const weeks = Math.ceil((offset + daysInMonth) / 7)
  const monday = addDays(firstIso, -offset)
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(monday, index))
}

export function formatDayLabel(iso: string): string {
  const date = dateFromIso(iso)
  if (!date) {
    return iso
  }
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function formatMonthLabel(iso: string): string {
  const date = dateFromIso(iso)
  if (!date) {
    return iso
  }
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatIsoDate(iso: string): string {
  const date = dateFromIso(iso)
  if (!date) {
    return iso
  }
  return `${padded(date.getDate())}/${padded(date.getMonth() + 1)}/${date.getFullYear()}`
}
