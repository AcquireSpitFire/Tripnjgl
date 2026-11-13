// Gemeinsame Daten-Funktionen für alle Seiten.
// Klassisches Skript (keine Module): die Funktionen sind global und werden
// von script.js, exhibition.js, intro.js, events.js, exhibitions.js benutzt.
//
// Die Daten kommen aus der Payload-API (/api/exhibitions), die von derselben
// App ausgeliefert wird. Hier werden sie in die Form gebracht, die die
// Seiten-Skripte erwarten:
//   id, titel, theme, description, date, time, location,
//   locked (true/false), video (YouTube-URL oder -ID),
//   posters [ medium ], front_page medium, medien [ medium ]
// Ein Medium: { id, type ("image"|"video"), src, alt, name, width, height,
//               sizes: { thumb, medium, large } (je {url, width, height}) }
//
// Bei gesperrten Ausstellungen (locked: true) liefert die API ohne Login
// weder Deckblatt noch Medien, und die Dateien sind nicht abrufbar.

const API_PATH = "/api/exhibitions";
const CACHE_PREFIX = "tj:exhibition:";
const CACHE_TTL = 10 * 60 * 1000;   // 10 Minuten

let exhibitionsCache = null;   // alle Ausstellungen, sobald einmal geladen

function getExhibitionLink(exhibition) {
  return "/exhibition/" + encodeURIComponent(exhibition.id);
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

    if (date && (date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]))) {
      date = null;
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    console.warn("Invalid date for “" + exhibition.id + "”:", value);
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

// "2026-12-24" → "24 December 2026"
function formatDate(exhibition) {
  const date = parseDate(exhibition);

  return date
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
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
    console.error("Front page medium not found: " + frontPageReference.id);
  }

  return { ...exhibition, front_page: media || null };
}

// ---------- Bilder in passender Größe ----------

const SIZE_ORDER = ["thumb", "medium", "large"];

// URL einer Größe, Fallback auf die nächstgrößere bzw. das Original
function getImageUrl(media, size) {
  if (!media) {
    return "";
  }

  const start = Math.max(0, SIZE_ORDER.indexOf(size));

  for (let index = start; index < SIZE_ORDER.length; index += 1) {
    const candidate = media.sizes?.[SIZE_ORDER[index]];

    if (candidate?.url) {
      return candidate.url;
    }
  }

  return media.src || "";
}

// Setzt src, srcset, sizes, width/height (kein Layout-Sprung) und decoding.
//   size:  gewünschte Größe ("thumb" | "medium" | "large")
//   sizes: HTML-Attribut "sizes" für responsive Auswahl, z. B. "(max-width: 600px) 100vw, 50vw"
//   lazy:  true → loading="lazy"
//   priority: true → fetchpriority="high" (erstes sichtbares Bild)
function setImageSources(image, media, options = {}) {
  const size = options.size || "medium";
  const chosen = media.sizes?.[size];

  image.src = getImageUrl(media, size);

  const candidates = SIZE_ORDER
    .map((name) => media.sizes?.[name])
    .filter((entry) => entry?.url && entry.width);

  if (candidates.length > 1) {
    image.srcset = candidates.map((entry) => entry.url + " " + entry.width + "w").join(", ");
    image.sizes = options.sizes || "100vw";
  }

  const width = chosen?.width || media.width;
  const height = chosen?.height || media.height;

  if (width && height) {
    image.width = width;
    image.height = height;
  }

  image.decoding = "async";

  if (options.lazy) {
    image.loading = "lazy";
  }

  if (options.priority) {
    image.setAttribute("fetchpriority", "high");
  }

  return image;
}

// Bilder einer Ausstellung schon mal in den Browser-Cache holen
// (Deckblatt + die ersten Medien), z. B. während das Intro-Video läuft
function preloadExhibitionImages(exhibition, count = 6) {
  const items = [exhibition.front_page, ...(exhibition.medien || [])]
    .filter((item) => item && item.type === "image")
    .slice(0, count + 1);

  items.forEach((item) => {
    const image = new Image();

    image.decoding = "async";
    image.src = getImageUrl(item, "medium");
  });
}

// Poster als Element:
//   gesperrt            → <div class="poster_locked"><img></div>, kein Link
//   mit Intro-Video     → <a data-intro data-id> (intro.js öffnet das Overlay)
//   ohne Video          → <a> direkt zur Ausstellung
// options: { altText, size, sizes, lazy, priority } wie setImageSources
function createPosterElement(exhibition, poster, options = {}) {
  const image = document.createElement("img");

  setImageSources(image, poster, { size: "medium", ...options });
  image.alt = poster.alt || options.altText || "Poster: " + exhibition.titel;

  let wrapper;

  if (isLocked(exhibition)) {
    wrapper = document.createElement("div");
    wrapper.className = "poster_locked";
  } else {
    wrapper = document.createElement("a");
    wrapper.href = getExhibitionLink(exhibition);
    wrapper.dataset.id = exhibition.id;

    if (getYouTubeId(exhibition.video)) {
      wrapper.dataset.intro = "true";
    }
  }

  wrapper.appendChild(image);

  return wrapper;
}

// ---------- Laden ----------

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

// Ein Medium aus der API (Upload-Dokument) → Seitenformat
function mapMedia(media, name) {
  if (!media || typeof media !== "object" || !media.url) {
    return null;
  }

  const sizes = {};

  SIZE_ORDER.forEach((sizeName) => {
    const entry = media.sizes?.[sizeName];

    if (entry?.url) {
      sizes[sizeName] = { url: entry.url, width: entry.width, height: entry.height };
    }
  });

  return {
    id: String(media.id),
    type: (media.mimeType || "").startsWith("video/") ? "video" : "image",
    src: media.url,
    alt: media.alt || "",
    name: name || media.name || "",
    width: media.width,
    height: media.height,
    sizes,
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

// Kurzzeit-Cache im sessionStorage: intro.js legt die Ausstellung während des
// Videos ab, exhibition.js rendert sie dann ohne Wartezeit
function readCachedExhibition(id) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + id);
    const entry = raw && JSON.parse(raw);

    if (entry && Date.now() - entry.time < CACHE_TTL) {
      return entry.data;
    }
  } catch (error) {
    // sessionStorage nicht verfügbar (privater Modus o. ä.) – einfach ohne Cache
  }

  return null;
}

function cacheExhibition(exhibition) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + exhibition.id,
      JSON.stringify({ time: Date.now(), data: exhibition })
    );
  } catch (error) {
    // voll oder nicht verfügbar – ignorieren
  }
}

// Eine einzelne Ausstellung über ihre id (= slug), zuerst aus dem Kurzzeit-Cache
async function loadExhibition(id) {
  if (!isValidId(id)) {
    throw new Error("Invalid id: " + id);
  }

  const cached = readCachedExhibition(id);

  if (cached) {
    return cached;
  }

  const result = await fetchJson(
    API_PATH + "?where[slug][equals]=" + encodeURIComponent(id) + "&depth=1&limit=1"
  );

  if (!result.docs?.length) {
    throw new Error("Not found: " + id);
  }

  const exhibition = mapExhibition(result.docs[0]);

  cacheExhibition(exhibition);

  return exhibition;
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

// ---------- YouTube-Zustimmung ----------
//
// Videos liegen bei YouTube. Vor dem ersten Kontakt zu Google (Player-Skript,
// iframe) muss der Besucher zustimmen (§ 25 TDDDG / DSGVO). Die Entscheidung
// wird im localStorage gemerkt; /privacy bietet einen Knopf zum Zurücksetzen.

const YOUTUBE_CONSENT_KEY = "tj:consent:youtube";

function hasYouTubeConsent() {
  try {
    return localStorage.getItem(YOUTUBE_CONSENT_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function setYouTubeConsent(value) {
  try {
    if (value) {
      localStorage.setItem(YOUTUBE_CONSENT_KEY, "1");
    } else {
      localStorage.removeItem(YOUTUBE_CONSENT_KEY);
    }
  } catch (error) {
    // localStorage nicht verfügbar – dann gilt die Zustimmung nur für diesen Klick
  }
}

// Hinweiskarte an Stelle des Videos. options:
//   cover   – Medium (Deckblatt/Poster) als Hintergrund, vom eigenen Server
//   onPlay  – wird nach dem Klick auf „Play video“ aufgerufen
function createYouTubeNotice(options = {}) {
  const notice = document.createElement("div");

  notice.className = "yt_notice";

  if (options.cover) {
    const image = document.createElement("img");

    setImageSources(image, options.cover, { size: "medium", lazy: true });
    image.alt = "";
    image.className = "yt_notice_cover";
    notice.appendChild(image);
  }

  const body = document.createElement("div");

  body.className = "yt_notice_body";

  const text = document.createElement("p");

  text.className = "yt_notice_text";
  text.append(
    "This video is hosted on YouTube. If you play it, your IP address and device information are sent to Google. Details in the ",
  );

  const link = document.createElement("a");

  link.href = "/privacy";
  link.textContent = "privacy policy";
  text.appendChild(link);
  text.append(". Your choice is remembered in this browser.");
  body.appendChild(text);

  const button = document.createElement("button");

  button.type = "button";
  button.className = "yt_notice_button";
  button.textContent = "▶ Play video";
  button.addEventListener("click", () => {
    setYouTubeConsent(true);
    options.onPlay?.();
  });
  body.appendChild(button);

  notice.appendChild(body);

  return notice;
}

// /privacy: „Forget my YouTube consent“
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-reset-youtube-consent]");

  if (!button) {
    return;
  }

  setYouTubeConsent(false);
  button.textContent = "Done – the notice will be shown again before videos.";
  button.disabled = true;
});
