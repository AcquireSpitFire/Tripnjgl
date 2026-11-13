# Tripnjungle CMS

Payload 3 (Admin + REST-API) mit SQLite, Next.js liefert das Frontend aus. Die Seite
startet leer: alle Ausstellungen, Poster, Fotos und Videos kommen über das Admin-Panel.

## Lokal starten

```
cd cms
cp .env.example .env        # PAYLOAD_SECRET eintragen
npm install
npm run dev
```

- Frontend: http://localhost:3000/
- Admin: http://localhost:3000/admin (beim ersten Aufruf Admin-Nutzer anlegen)

## Inhalte pflegen

Im Admin unter **Ausstellungen**:

- Neue Ausstellung: ID (wird Teil der URL, z. B. `brasil-1` → `/exhibition/brasil-1`), Titel, Thema,
  Beschreibung, Datum, Uhrzeit, Ort, Intro-Video (YouTube), Poster, Deckblatt, Bilder und Videos.
- Nachträglich Fotos/Videos/Poster hinzufügen, umsortieren (Drag & Drop) oder entfernen.
- **Gesperrt** (Standard: an): Poster und Details sind öffentlich (Events, Startseite), die Ausstellung
  selbst nicht. Haken entfernen = freischalten. Gesperrte Ausstellungen fehlen in Slideshow,
  Exhibitions-Liste und Sitemap; ihre Dateien sind nicht abrufbar.
- Bilder werden beim Upload in drei WebP-Größen (600/1280/2560 px) abgelegt, das Original bleibt.
- Erlaubte Dateitypen: JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV. Kein SVG, kein HEIC
  (iPhone-Fotos vorher als JPEG exportieren).

## Site settings (About, Impressum, Datenschutz)

Im Admin unter **Site settings** (Globals), vor dem Livegang komplett ausfüllen:

- **About**: Seitenbeschreibung für Suchmaschinen, About-Text (Leerzeile = Absatz), Kontakt-Mail.
- **Legal notice**: Land (Deutschland/Österreich, steuert die Gesetzesangaben), Name, Anschrift,
  E-Mail, Telefon, ggf. Rechtsform/Register/UID, Verantwortlicher nach § 18 MStV (nur DE).
- **Privacy**: Hoster (Name, Adresse, Serverstandort, Sitz außerhalb der EU ja/nein, Link zu dessen
  Datenschutzerklärung), optionaler Zusatztext.

Die Seiten `/imprint` und `/privacy` entstehen daraus; sie sind im Footer jeder Seite verlinkt.
Fehlende Angaben erscheinen auf der Seite gelb markiert, damit nichts leer live geht.

**YouTube-Zustimmung:** Videos werden erst nach einem Klick auf „Play video“ geladen (Hinweiskarte mit
Link zur Datenschutzerklärung, Zwei-Klick-Lösung). Die Entscheidung wird im Browser gemerkt; erst dann
wird die YouTube-API im Hintergrund vorgeladen. Auf `/privacy` gibt es einen Knopf zum Zurücksetzen.
Dadurch braucht die Seite kein Cookie-Banner: YouTube ist der einzige Drittanbieter, das Admin-Cookie
ist technisch notwendig.

## Hosting (Railway)

1. Repo zu GitHub pushen, in Railway „Deploy from GitHub“, **Root Directory: `cms`**.
2. Volume anlegen und unter `/data` einhängen.
3. Variablen setzen:
   - `PAYLOAD_SECRET` – langer Zufallsstring
   - `DATABASE_URI=file:/data/tripnjungle.db`
   - `MEDIA_DIR=/data/media`
   - `PAYLOAD_PUBLIC_SERVER_URL=https://deine-domain.de`
4. Domain in Railway hinzufügen, beim Registrar den angezeigten CNAME setzen.
5. Nach dem ersten Deploy sofort `https://deine-domain.de/admin` öffnen und den Admin-Nutzer anlegen.
6. **Site settings** ausfüllen (Impressum, Datenschutz, About), dann `/imprint` und `/privacy` prüfen.

`npm start` führt zuerst die Datenbank-Migrationen aus (`src/migrations`) und startet dann den Server.
Backup = `tripnjungle.db` + Ordner `media/` kopieren.

Für einen eigenen Server (VPS) gilt dasselbe: Node 24, `.env` wie oben, `npm ci && npm run build`,
`npm start` unter PM2/systemd, Caddy oder nginx als HTTPS-Proxy davor.

## Schema ändern

Nach Änderungen an den Collections: `npm run migrate:create` erzeugt eine neue Migration in
`src/migrations`; sie läuft beim nächsten `npm start` automatisch. Lokal (`npm run dev`) wird das
Schema direkt angepasst.

## Dateien

- `src/collections/Exhibitions.ts` – Felder, Zugriff, Hook, der `locked` auf die Medien überträgt
- `src/collections/Media.ts` – Uploads (`MEDIA_DIR`), Bildgrößen, öffentlich nur mit `locked: false`
- `src/globals/Site.ts` – Site settings (About, Impressum, Datenschutz); `src/lib/site.ts` bereitet sie für die Vorlagen auf
- `src/templates/*.html` – die Seiten; `src/app/**/route.ts` liefert sie mit Titel, Beschreibung,
  Open Graph und JSON-LD aus (`/`, `/exhibitions`, `/events`, `/archive`, `/about`, `/imprint`, `/privacy`, `/exhibition/<id>`)
- `src/app/sitemap.xml`, `src/app/robots.txt` – SEO
- `src/migrations/` – Datenbank-Migrationen für die Produktion
- `public/` – CSS, JS, Favicon, OG-Bild; `public/js/data.js` spricht die API an und wählt die Bildgröße
- `scripts/regenerate-sizes.ts` – Bildgrößen für vorhandene Medien neu erzeugen (`npm run media:regenerate`)
- `scripts/set-locked.ts` – Ausstellung per Kommandozeile sperren/entsperren (zum Testen)
- `tripnjungle.db`, `media/`, `.env` – lokal, nicht im Git
