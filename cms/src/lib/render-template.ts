// HTML-Vorlagen aus src/templates mit Meta-Daten füllen.
//   {{key}}   → HTML-escaped
//   {{{key}}} → roh (für JSON-LD)
import fs from 'fs'
import path from 'path'

// Relativ zum Arbeitsverzeichnis (cms/), weil der gebündelte Code im Build
// an anderer Stelle liegt als die Quelldatei
const templatesDir = path.join(process.cwd(), 'src', 'templates')
const cache = new Map<string, string>()

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// "</script>" im JSON-LD darf das Script-Tag nicht beenden
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function readTemplate(name: string): string {
  const cached = cache.get(name)

  if (cached && process.env.NODE_ENV === 'production') {
    return cached
  }

  const html = fs.readFileSync(path.join(templatesDir, name), 'utf8')

  cache.set(name, html)

  return html
}

export function renderTemplate(name: string, values: Record<string, string>): string {
  return readTemplate(name)
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => values[key] ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(values[key] ?? ''))
}

// Kürzt eine Beschreibung auf Meta-Länge
export function summarize(text: string | null | undefined, max = 160): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()

  if (clean.length <= max) {
    return clean
  }

  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

// Content-Security-Policy für die Frontend-Seiten (nicht für /admin, das hat eigene Regeln).
// Erlaubt: eigene Skripte/Styles/Bilder, YouTube-Player (API-Skript + iframe), sonst nichts.
// Inline-Skripte sind nicht erlaubt; das JSON-LD ist ein Datenblock und wird nicht ausgeführt.
function contentSecurityPolicy(): string {
  // Medien-URLs sind absolut auf PAYLOAD_PUBLIC_SERVER_URL; falls die Seite unter einer
  // anderen Adresse aufgerufen wird (z. B. Vorschau-Domain), muss diese Origin erlaubt sein
  const serverOrigin = (process.env.PAYLOAD_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
  const self = ["'self'", serverOrigin].filter(Boolean).join(' ')

  return [
    "default-src 'self'",
    `script-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com`,
    "style-src 'self'",
    `img-src ${self} data:`,
    `media-src ${self}`,
    `connect-src ${self}`,
    'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
    "font-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ')
}

export function htmlResponse(html: string, init?: { status?: number; cache?: string }): Response {
  return new Response(html, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': init?.cache ?? 'public, s-maxage=60, stale-while-revalidate=600',
      'Content-Security-Policy': contentSecurityPolicy(),
    },
  })
}
