// Gemeinsame Daten-Funktionen für alle Seiten.
// Klassisches Skript (keine Module): die Funktionen sind global und werden
// von script.js, exhibition.js, intro.js, events.js, exhibitions.js benutzt.
//
// Die Daten kommen aus der Payload-API (/api/exhibitions), die von derselben
// App ausgeliefert wird. Hier werden sie in die Form gebracht, die die
// Seiten-Skripte erwarten (wie früher die JSON-Dateien):
//   id, titel, theme, description, date, time, location,
//   locked (true/false), video (YouTube-URL oder -ID),
//   posters [ {id, type, src, alt} ], front_page {type, src, alt}, medien [ {...} ]
//
// Bei gesperrten Ausstellungen (locked: true) liefert die API ohne Login
// weder Deckblatt noch Medien, und die Dateien sind nicht abrufbar.

const API_PATH = "/api/exhibitions";

let exhibitionsCache = null;   // alle Ausstellungen, sobald einmal geladen

function getExhibitionLink(exhibition) {
  return "exhibition.html?id=" + encodeURIComponent(exhibition.id);
}

// Nur ausdrücklich freigeschaltete Ausstellungen (locked: false) sind offen.
// Fehlt das Feld, gilt die Ausstellung als gesperrt.
function isLocked(exhibition) {
  return exhibition?.locked !== false;
}

// YouTube-ID aus URL (watch, youtu.be, embed, shorts, live) oder nackter ID
function getYouTubeId(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (/^[\w-]{11}$/.test(text)) {
    return text;
  }

  const match = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(text);

  return match ? match[1] : null;
}

// Datum → Date (lokale Zeit, 0 Uhr), bei ungültigem Datum null.
// Die API liefert ISO-Strings ("2026-12-24T00:00:00.000Z" für lokale
// Mitternacht), die alten JSON-Dateien "JJJJ-MM-TT".
function parseDate(exhibition) {
  const value = exhibition?.date;

  if (!value) {
    return null;
  }

  let date;

  if (value.includes("T")) {
    date = new Date(value);
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    date = match && new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    // new Date() rechnet z. B. Monat 24 einfach um, das wäre ein falsches Datum
    if (date && (date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]))) {
      date = null;
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    console.warn("Ungültiges Datum bei „" + exhibition.id + "“:", value);
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

// Nummer aus der id: "exhibition-12" → 12
function getNumber(exhibition) {
  const match = /(\d+)$/.exec(exhibition.id);

  return match ? Number(match[1]) : Infinity;
}

function getToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

// Findet noch statt (heute oder später)
function isUpcoming(exhibition, today = getToday()) {
  const date = parseDate(exhibition);

  return !!date && date >= today;
}

// Hat schon stattgefunden
function isPast(exhibition, today = getToday()) {
  const date = parseDate(exhibition);

  return !!date && date < today;
}

// Frühestes Datum zuerst, bei gleichem Datum die kleinere Nummer
function compareByDate(a, b) {
  return (parseDate(a) - parseDate(b)) || (getNumber(a) - getNumber(b));
}

// "2026-12-24" → "24. Dezember 2026"
function formatDate(exhibition) {
  const date = parseDate(exhibition);

  return date
    ? date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
    : "";
}

// Ergänzt das Deckblatt um das passende Medium, falls es nur als id vorliegt
// (aus der API kommt es schon fertig mit src)
function resolveFrontPage(exhibition) {
  const frontPageReference = exhibition.front_page;

  if (!frontPageReference?.id || frontPageReference.src) {
    return exhibition;
  }

  const media = (exhibition.medien || []).find((item) => item.id === frontPageReference.id);

  if (!media) {
    console.error("Deckblatt-Medium nicht gefunden: " + frontPageReference.id);
  }

  return { ...exhibition, front_page: media || null };
}

// Poster als Element:
//   gesperrt            → <div class="poster_locked"><img></div>, kein Link
//   mit Intro-Video     → <a data-intro> (intro.js öffnet das Overlay)
//   ohne Video          → <a> direkt zur Ausstellung
function createPosterElement(exhibition, poster, altText) {
  const image = document.createElement("img");

  image.src = poster.src;
  image.alt = poster.alt || altText || "Poster: " + exhibition.titel;

  let wrapper;

  if (isLocked(exhibition)) {
    wrapper = document.createElement("div");
    wrapper.className = "poster_locked";
  } else {
    wrapper = document.createElement("a");
    wrapper.href = getExhibitionLink(exhibition);

    if (getYouTubeId(exhibition.video)) {
      wrapper.dataset.intro = "true";
    }
  }

  wrapper.appendChild(image);

  return wrapper;
}

// Nur einfache ids erlauben
function isValidId(id) {
  return /^[a-z0-9-]+$/i.test(id || "");
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return response.json();
}

// ---------- API → Seitenformat ----------

// Ein Medium aus der API (Upload-Dokument) → {id, type, src, alt, name}
function mapMedia(media, name) {
  if (!media || typeof media !== "object" || !media.url) {
    return null;
  }

  return {
    id: String(media.id),
    type: (media.mimeType || "").startsWith("video/") ? "video" : "image",
    src: media.url,
    alt: media.alt || "",
    name: name || media.name || "",
  };
}

function mapExhibition(doc) {
  return {
    id: doc.slug,
    titel: doc.titel,
    theme: doc.theme || "",
    description: doc.description || "",
    date: doc.date || null,
    time: doc.time || "",
    location: doc.location || "",
    locked: doc.locked,
    video: doc.video || "",
    posters: (doc.posters || []).map((poster) => mapMedia(poster)).filter(Boolean),
    front_page: mapMedia(doc.frontPage),
    medien: (doc.medien || [])
      .map((row) => mapMedia(row.file, row.name))
      .filter(Boolean),
  };
}

// Eine einzelne Ausstellung über ihre id (= slug)
async function loadExhibition(id) {
  if (!isValidId(id)) {
    throw new Error("Ungültige id: " + id);
  }

  const result = await fetchJson(
    API_PATH + "?where[slug][equals]=" + encodeURIComponent(id) + "&depth=1&limit=1"
  );

  if (!result.docs?.length) {
    throw new Error("Nicht gefunden: " + id);
  }

  return mapExhibition(result.docs[0]);
}

// Alle Ausstellungen, nach Datum sortiert
async function loadExhibitions() {
  if (exhibitionsCache) {
    return exhibitionsCache;
  }

  const result = await fetchJson(API_PATH + "?limit=100&depth=1&sort=date");

  exhibitionsCache = (result.docs || []).map(mapExhibition);

  return exhibitionsCache;
}

// Eine Ausstellung: aus dem Cache, sonst einzeln nachladen
async function getExhibition(id) {
  const cached = exhibitionsCache?.find((exhibition) => exhibition.id === id);

  return cached || loadExhibition(id);
}
