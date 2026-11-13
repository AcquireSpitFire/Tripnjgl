// Seitenweite Einstellungen (Global "site") laden und für die Vorlagen aufbereiten
import type { Payload } from 'payload'

import type { Site } from '../payload-types'
import { escapeHtml } from './render-template'

export type SiteSettings = Site

export async function getSiteSettings(payload: Payload): Promise<SiteSettings> {
  return payload.findGlobal({ slug: 'site', depth: 0 })
}

// Textarea → <p>…</p> je Absatz (Leerzeile), Zeilenumbruch innerhalb → <br>
export function paragraphs(text: string | null | undefined): string {
  const clean = (text || '').replace(/\r\n/g, '\n').trim()

  if (!clean) {
    return ''
  }

  return clean
    .split(/\n\s*\n/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Textarea → <ul><li>…</li></ul>, eine Zeile = ein Punkt
export function lines(text: string | null | undefined): string {
  const items = (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!items.length) {
    return ''
  }

  return `<ul>${items.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
}

// Fehlende Pflichtangabe sichtbar markieren, damit sie vor dem Livegang auffällt
export function required(value: string | null | undefined, label: string): string {
  const clean = (value || '').trim()

  return clean
    ? escapeHtml(clean)
    : `<mark>[${escapeHtml(label)} – fill in under Admin → Site settings]</mark>`
}

export function optional(value: string | null | undefined): string {
  return escapeHtml((value || '').trim())
}

export function mailLink(value: string | null | undefined, label: string): string {
  const clean = (value || '').trim()

  return clean
    ? `<a href="mailto:${escapeHtml(clean)}">${escapeHtml(clean)}</a>`
    : required('', label)
}

export function urlLink(value: string | null | undefined): string {
  const clean = (value || '').trim()

  return /^https?:\/\//.test(clean)
    ? `<a href="${escapeHtml(clean)}" rel="noopener">${escapeHtml(clean)}</a>`
    : ''
}

export function formatDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date()

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
