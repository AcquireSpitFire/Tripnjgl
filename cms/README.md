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

Einmalige Einrichtung, etwa eine Stunde. Alles Weitere passiert danach im Admin.

1. Alles committen und zu GitHub pushen (`.env`, `*.db` und `media/` bleiben per .gitignore draußen).
2. Auf railway.com anmelden, **New Project → Deploy from GitHub repo**, dieses Repo wählen.
3. Im Service unter **Settings**:
   - **Root Directory: `cms`** (sonst findet Railway kein package.json)
   - **Region: Europe** (Amsterdam). Dann bleiben die Daten in der EU.
   - Build und Start übernimmt `cms/railway.json` (`npm ci && npm run build`, `npm start`, Healthcheck `/robots.txt`).
4. **Volume** anlegen (rechte Maustaste auf den Service → Attach Volume), Mount Path **`/data`**.
   Dort liegen Datenbank und Medien; ohne Volume ist nach jedem Deploy alles weg.
5. Unter **Variables** eintragen:
   - `PAYLOAD_SECRET` – langer Zufallsstring, z. B. aus `openssl rand -hex 32`; nie weitergeben
   - `DATABASE_URI=file:/data/tripnjungle.db`
   - `MEDIA_DIR=/data/media`
   - `PAYLOAD_PUBLIC_SERVER_URL=https://deine-domain.de` (ohne Schrägstrich am Ende; bis die Domain
     steht, die von Railway erzeugte `https://….up.railway.app`-Adresse eintragen)
6. **Settings → Networking → Custom Domain**: Domain eintragen, den angezeigten CNAME beim Registrar
   setzen. HTTPS richtet Railway automatisch ein. Danach `PAYLOAD_PUBLIC_SERVER_URL` auf die Domain
   ändern (löst einen Neustart aus).
7. Nach dem ersten erfolgreichen Deploy **sofort** `https://deine-domain.de/admin` öffnen und den
   Admin-Nutzer anlegen. Wer das zuerst tut, ist Admin. Starkes Passwort.
8. **Site settings** ausfüllen. Für die Datenschutzerklärung unter Privacy:
   - Hosting provider: `Railway Corporation`, Adresse laut Impressum/Terms auf railway.com
   - Server location: `Amsterdam, Netherlands (EU)`
   - Haken **„outside the EU/EEA“ setzen** (US-Unternehmen, auch wenn der Server in der EU steht)
   - Link zur Datenschutzerklärung von Railway (railway.com/legal/privacy)
   - Den Auftragsverarbeitungsvertrag (DPA) von Railway unter railway.com/legal akzeptieren bzw. ablegen.
9. Prüfen: Startseite, `/robots.txt` und `/sitemap.xml` zeigen die Domain, `/imprint` und
   `/privacy` ohne gelbe Markierungen, ein Testposter hochladen, Video-Hinweis und Player testen.
10. Domain in der Google Search Console anmelden, Sitemap `https://deine-domain.de/sitemap.xml` eintragen.

Jeder weitere Push auf den verbundenen Branch löst automatisch Build und Deploy aus. `npm start` führt
zuerst die Datenbank-Migrationen aus (`src/migrations`) und startet dann den Server.

**Backup:** Railway sichert Volumes nicht automatisch dauerhaft. Unter Volume → Backups lassen sich
tägliche Snapshots aktivieren (kostenpflichtig). Zusätzlich gelegentlich `tripnjungle.db` und `media/`
aus dem Volume herunterladen (Railway CLI: `railway ssh` bzw. Volume-Download).

**Kosten:** Hobby-Plan etwa 5 USD/Monat inklusive Guthaben; die Seite verbraucht davon wenig.

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
