// Gemeinsame SEO-Helfer für die Route Handler (Ausstellung, Events, Sitemap)
import type { Payload, Where } from 'payload'

import type { Exhibition, Media } from '../payload-types'

export const SITE_NAME = 'Tripnjungle'
export const SITE_DESCRIPTION =
  "Tripnjungle is Tom's web gallery: photo and video exhibitions from trips, nights out and everything in between."

export function getServerUrl(payload: Payload): string {
  return (payload.config.serverURL || 'http://localhost:3000').replace(/\/$/, '')
}

type MediaRef = number | string | Media | null | undefined

export function asMedia(ref: MediaRef): Media | null {
  return ref && typeof ref === 'object' ? ref : null
}

// Beste öffentliche Bild-URL eines Mediums (large → medium → Original)
export function imageUrl(media: Media | null, size: 'large' | 'medium' | 'thumb' = 'large'): string | null {
  if (!media) {
    return null
  }

  const sizes = (media.sizes || {}) as Record<string, { url?: string | null } | undefined>

  return sizes[size]?.url || sizes.medium?.url || media.url || null
}

export function absolute(base: string, url: string | null): string | null {
  if (!url) {
    return null
  }

  return /^https?:\/\//.test(url) ? url : base + url
}

// Ausstellungen so laden, wie sie ein Besucher ohne Login sieht
export async function findPublicExhibitions(payload: Payload, where?: Where) {
  const result = await payload.find({
    collection: 'exhibitions',
    where,
    depth: 1,
    limit: 100,
    sort: 'date',
    overrideAccess: false,
  })

  return result.docs
}

export function isUpcoming(exhibition: Exhibition): boolean {
  if (!exhibition.date) {
    return false
  }

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  return new Date(exhibition.date) >= today
}

// JSON-LD "Event" für eine kommende Ausstellung
export function eventJsonLd(exhibition: Exhibition, base: string) {
  const poster = asMedia(exhibition.posters?.[0])
  const image = absolute(base, imageUrl(poster))
  const startDate = exhibition.date
    ? exhibition.date.slice(0, 10) + (exhibition.time ? 'T' + exhibition.time.padStart(5, '0') : '')
    : undefined

  return {
    '@type': 'ExhibitionEvent',
    name: exhibition.titel,
    description: exhibition.description || undefined,
    startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: exhibition.location
      ? { '@type': 'Place', name: exhibition.location, address: exhibition.location }
      : undefined,
    image: image ? [image] : undefined,
    url: `${base}/exhibition/${encodeURIComponent(exhibition.slug)}`,
    organizer: { '@type': 'Organization', name: SITE_NAME, url: base },
  }
}
