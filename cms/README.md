# Tripnjungle CMS

Payload 3 (Admin-Oberfläche + REST-API) mit SQLite. Das statische Frontend
(`public/`) wird von derselben App ausgeliefert.

## Starten

```
cd cms
cp .env.example .env        # PAYLOAD_SECRET eintragen
npm install
npm run import:json         # einmalig: ../data/exhibitions/*.json in die Datenbank
npm run dev
```

- Frontend: http://localhost:3000/
- Admin: http://localhost:3000/admin (beim ersten Aufruf Admin-Nutzer anlegen)
- API: http://localhost:3000/api/exhibitions

## Inhalte pflegen

Alles passiert im Admin unter **Ausstellungen**:

- Neue Ausstellung: ID (URL), Titel, Thema, Beschreibung, Datum, Uhrzeit, Ort,
  Intro-Video (YouTube), Poster, Deckblatt, Bilder und Videos.
- Nachträglich Fotos/Videos/Poster hinzufügen, umsortieren (Drag & Drop) oder entfernen.
- **Gesperrt** (Standard: an): Poster und Details sind öffentlich, die Ausstellung
  selbst nicht. Haken entfernen = freischalten.
- Löschen über die Listenansicht.

Ohne Login liefert die API bei gesperrten Ausstellungen weder Deckblatt noch
Medien, und die zugehörigen Dateien sind nicht abrufbar.

## Dateien

- `src/collections/Exhibitions.ts` – Felder, Zugriff, Hook, der `locked` auf die Medien überträgt
- `src/collections/Media.ts` – Uploads (`media/`), öffentlich nur mit `locked: false`
- `scripts/import-json.ts` – Import der alten JSON-Dateien (`npm run import:json`)
- `scripts/set-locked.ts` – Ausstellung per Kommandozeile sperren/entsperren (zum Testen):
  `npx tsx --env-file=.env scripts/set-locked.ts exhibition-2 true`
- `public/` – Frontend (HTML/CSS/JS), `public/js/data.js` spricht die API an
- `tripnjungle.db` – die Datenbank (nicht im Git)
- `media/` – hochgeladene Dateien (nicht im Git). Die Originale liegen weiter in
  `../data/image`, damit `npm run import:json` auf einem frischen Klon funktioniert.

## Neu aufsetzen (frischer Klon)

```
cd cms && cp .env.example .env && npm install && npm run import:json && npm run dev
```
