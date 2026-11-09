// Die Ausstellungen werden aus data/exhibitions/index.json geladen:
// jede Ausstellung ist ein Slide mit ihrem Deckblatt.
// Gibt es eine kommende Ausstellung, steht ihr Poster über der Slideshow.
let slides = [];

let currentSlide = 0;
let timer;

const slideContent = document.getElementById("slide_content");
const dotsContainer = document.getElementById("dots");
const posterContainer = document.getElementById("front_poster");

function getExhibitionLink(exhibition) {
  return "exhibition.html?id=" + encodeURIComponent(exhibition.id);
}

function showSlide(index) {
  clearTimeout(timer);
  currentSlide = (index + slides.length) % slides.length;

  const exhibition = slides[currentSlide];
  const front_page = exhibition.front_page;
  const link = getExhibitionLink(exhibition);

  slideContent.innerHTML = "";

  if (front_page?.type === "image") {
    // Das ganze Bild ist ein Link zur Ausstellung
    const anchor = document.createElement("a");
    anchor.href = link;

    const image = document.createElement("img");

    image.src = front_page.src;
    image.alt = front_page.alt || exhibition.titel;

    anchor.appendChild(image);
    slideContent.appendChild(anchor);
    startTimer(5000);
  }

  if (front_page?.type === "video") {
    const video = document.createElement("video");

    video.src = front_page.src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    slideContent.appendChild(video);

    // Nach dem Ende des Videos zum nächsten Slide wechseln
    video.addEventListener("ended", nextSlide);
  } else if (!front_page) {
    startTimer(5000);
  }

  // Titel als Link unter jedem Slide (bei Videos der einzige Link,
  // weil die Video-Steuerung Klicks auf das Video selbst abfängt)
  const titleLink = document.createElement("a");
  titleLink.href = link;
  titleLink.className = "slide_link";
  titleLink.textContent = exhibition.titel + " – zur Ausstellung ›";
  slideContent.appendChild(titleLink);

  updateDots();
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function previousSlide() {
  showSlide(currentSlide - 1);
}

// Wischen nach links = nächster Slide, nach rechts = vorheriger Slide
function setupSwipe() {
  let startX = 0;
  let startY = 0;

  slideContent.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  slideContent.addEventListener("touchend", (event) => {
    const deltaX = event.changedTouches[0].clientX - startX;
    const deltaY = event.changedTouches[0].clientY - startY;

    // Nur deutliche, eher waagrechte Wischer zählen (kein Scrollen, kein Tippen)
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  });
}

// Pfeiltaste rechts = nächster Slide, links = vorheriger Slide
function setupKeys() {
  document.addEventListener("keydown", (event) => {
    // Ein Video mit Fokus nutzt die Pfeiltasten selbst zum Spulen
    if (event.target.tagName === "VIDEO") {
      return;
    }

    if (event.key === "ArrowRight") {
      nextSlide();
    } else if (event.key === "ArrowLeft") {
      previousSlide();
    }
  });
}

function startTimer(duration) {
  clearTimeout(timer);
  timer = setTimeout(nextSlide, duration);
}

function updateDots() {
  dotsContainer.innerHTML = "";

  slides.forEach((slide, index) => {
    const dot = document.createElement("button");

    dot.className = "dot";
    dot.setAttribute("aria-label", `Slide ${index + 1}`);

    if (index === currentSlide) {
      dot.classList.add("active");
    }

    dot.addEventListener("click", () => {
      showSlide(index);
    });

    dotsContainer.appendChild(dot);
  });
}

// ---------- Poster ----------

// "JJJJ-MM-TT" → Datum (lokale Zeit), bei ungültigem Datum null
function parseDate(exhibition) {
  if (!exhibition.date) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(exhibition.date);
  const date = match && new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  // new Date() rechnet z. B. Monat 24 einfach um, das wäre ein falsches Datum
  if (!date || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    console.warn("Ungültiges Datum bei „" + exhibition.id + "“ (erwartet JJJJ-MM-TT):", exhibition.date);
    return null;
  }

  return date;
}

// Nummer aus der id: "exhibition-12" → 12
function getNumber(exhibition) {
  const match = /(\d+)$/.exec(exhibition.id);

  return match ? Number(match[1]) : Infinity;
}

// Die Ausstellung mit dem frühesten Datum ab heute,
// bei gleichem Datum die mit der geringsten Nummer
function findNextExhibition(exhibitions) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const upcoming = exhibitions
    .filter((exhibition) => exhibition.poster?.src)
    .map((exhibition) => ({ exhibition, date: parseDate(exhibition) }))
    .filter(({ date }) => date && date >= today)
    .sort((a, b) => (a.date - b.date) || (getNumber(a.exhibition) - getNumber(b.exhibition)));

  return upcoming[0]?.exhibition;
}

// Das Poster nimmt den Platz der Slideshow ein, die Slideshow rutscht
// darunter. Die Seite passt dann nicht mehr auf einen Bildschirm und scrollt.
function showPoster(exhibition) {
  const anchor = document.createElement("a");
  const image = document.createElement("img");

  anchor.href = getExhibitionLink(exhibition);
  image.src = exhibition.poster.src;
  image.alt = exhibition.poster.alt || "Poster: " + exhibition.titel;

  anchor.appendChild(image);
  posterContainer.appendChild(anchor);
  posterContainer.hidden = false;
  document.documentElement.classList.replace("fit", "has_poster");
}

// ---------- Laden ----------

// Ergänzt das Deckblatt (in der JSON nur eine id) um das passende Medium
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

// Lädt die Liste und ergänzt jeden Eintrag um die Daten aus seiner eigenen JSON
async function loadExhibitions() {
  const response = await fetch("data/exhibitions/index.json");

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const exhibitions = await response.json();

  return Promise.all(exhibitions.map(async (entry) => {
    try {
      const exhibitionResponse = await fetch(
        "data/exhibitions/" + encodeURIComponent(entry.id) + ".json"
      );

      if (!exhibitionResponse.ok) {
        throw new Error("HTTP " + exhibitionResponse.status);
      }

      return { ...entry, ...(await exhibitionResponse.json()) };
    } catch (error) {
      console.error("Ausstellung „" + entry.id + "“ konnte nicht geladen werden.", error);
      return entry;
    }
  }));
}

async function start() {
  let exhibitions;

  try {
    exhibitions = await loadExhibitions();
  } catch (error) {
    slideContent.textContent = "Ausstellungen konnten nicht geladen werden.";
    console.error(error);
    return;
  }

  if (exhibitions.length === 0) {
    slideContent.textContent = "Noch keine Ausstellungen vorhanden.";
    return;
  }

  // Poster vor der Slideshow einsetzen, damit nichts sichtbar springt
  const nextExhibition = findNextExhibition(exhibitions);

  if (nextExhibition) {
    showPoster(nextExhibition);
  }

  slides = exhibitions.map(resolveFrontPage);

  document.getElementById("next").addEventListener("click", nextSlide);
  document.getElementById("prev").addEventListener("click", previousSlide);
  setupSwipe();
  setupKeys();

  showSlide(0);
}

start();
