// HTML-Vorlagen aus src/templates mit Meta-Daten füllen.
//   {{key}}   → HTML-escaped
//   {{{key}}} → roh (für JSON-LD)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesDir = path.resolve(dirname, '..', 'templates')
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

export function htmlResponse(html: string, init?: { status?: number; cache?: string }): Response {
  return new Response(html, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': init?.cache ?? 'public, s-maxage=60, stale-while-revalidate=600',
    },
  })
}
