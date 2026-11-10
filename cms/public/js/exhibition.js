// Zeigt eine Ausstellung an. Welche, steht in der URL:
// exhibition.html?id=exhibition-1  →  lädt data/exhibitions/exhibition-1.json
//
// Oben: Slideshow mit Deckblatt + allen Bildern/Videos.
// Darunter: Galerie mit allen Bildern/Videos
// (Handy: untereinander, Desktop: seitlich scrollbares Band).

const titelElement = document.getElementById("titel");
const themeElement = document.getElementById("theme");
const descriptionElement = document.getElementById("description");
const slideshowElement = document.getElementById("slideshow");
const slideContent = document.getElementById("slide_content");
const dotsContainer = document.getElementById("dots");
const galerieElement = document.getElementById("galerie");

let slides = [];
let currentSlide = 0;
let timer;

// Name eines Bildes/Videos: "name" aus der JSON, sonst der alt-Text
function getName(item) {
  return item.name || item.alt || "";
}

function createMedia(item) {
  if (item.type === "video") {
    const video = document.createElement("video");

    video.src = item.src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    return video;
  }

  const image = document.createElement("img");

  image.src = item.src;
  image.alt = item.alt || "";
  image.loading = "lazy";

  return image;
}

// ---------- Slideshow ----------

function showSlide(index) {
  clearTimeout(timer);
  currentSlide = (index + slides.length) % slides.length;

  const item = slides[currentSlide];

  slideContent.innerHTML = "";

  if (item.type === "video") {
    const video = createMedia(item);

    video.autoplay = true;
    video.muted = true;

    // Nach dem Ende des Videos zum nächsten Slide wechseln
    video.addEventListener("ended", nextSlide);
    slideContent.appendChild(video);
  } else {
    const image = createMedia(item);

    image.loading = "eager";   // das sichtbare Bild sofort laden
    slideContent.appendChild(image);
    startTimer(5000);
  }

  // Name unter dem Bild, wie der Link auf der Startseite. Die Zeile ist
  // immer da, auch ohne Namen, damit die Punkte nicht springen.
  const caption = document.createElement("p");

  caption.className = "slide_caption";
  caption.textContent = getName(item);
  slideContent.appendChild(caption);

  updateDots();
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function previousSlide() {
  showSlide(currentSlide - 1);
}

// Wischen nach links = nächstes Bild, nach rechts = vorheriges Bild
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
    if (slides.length < 2 || Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  });
}

// Pfeiltaste rechts = nächstes Bild, links = vorheriges Bild
function setupKeys() {
  document.addEventListener("keydown", (event) => {
    // Ein Video mit Fokus nutzt die Pfeiltasten selbst zum Spulen,
    // und solange ein Bild im Vollbild offen ist, bleibt die Slideshow stehen
    if (slides.length < 2 || event.target.tagName === "VIDEO" || !viewerElement.hidden) {
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

  // Bei nur einem Bild gibt es nichts zum Weiterblättern
  if (slides.length > 1) {
    timer = setTimeout(nextSlide, duration);
  }
}

function updateDots() {
  dotsContainer.innerHTML = "";

  slides.forEach((slide, index) => {
    const dot = document.createElement("button");

    dot.className = "dot";
    dot.setAttribute("aria-label", `Bild ${index + 1}`);

    if (index === currentSlide) {
      dot.classList.add("active");
    }

    dot.addEventListener("click", () => {
      showSlide(index);
    });

    dotsContainer.appendChild(dot);
  });
}

function setupSlideshow(exhibition) {
  // Deckblatt zuerst, danach alle Medien – ohne das Deckblatt doppelt zu zeigen
  const medien = exhibition.medien || [];
  const frontPageReference = exhibition.front_page;
  const frontPage = frontPageReference?.src
    ? frontPageReference
    : medien.find((item) => item.id === frontPageReference?.id);

  slides = frontPage
    ? [frontPage, ...medien.filter((item) => item.id !== frontPage.id && item.src !== frontPage.src)]
    : medien.slice();

  if (slides.length === 0) {
    slideshowElement.hidden = true;
    return;
  }

  // Punkte nur, wenn es mehr als ein Bild gibt
  if (slides.length === 1) {
    slideshowElement.classList.add("single");
  }

  document.getElementById("next").addEventListener("click", nextSlide);
  document.getElementById("prev").addEventListener("click", previousSlide);
  setupSwipe();
  setupKeys();
  showSlide(0);
}

// ---------- Galerie ----------

function setupGalerie(exhibition) {
  (exhibition.medien || []).forEach((item) => {
    // Jedes Bild/Video steckt in einer <figure>, darunter sein Name (falls vorhanden)
    const figure = document.createElement("figure");
    const name = getName(item);

    figure.appendChild(createMedia(item));

    if (name) {
      const caption = document.createElement("figcaption");

      caption.className = "caption";
      caption.textContent = name;
      figure.appendChild(caption);
    }

    // Jedes Foto/Video hat eine id, z. B. für Links wie exhibition.html?id=...#exhibition-1-2
    if (item.id) {
      figure.id = item.id;
    }

    galerieElement.appendChild(figure);
  });

  // Desktop: das Mausrad scrollt das Band seitlich. Am Anfang/Ende des
  // Bandes scrollt wieder die Seite, damit man nicht „hängen bleibt“.
  galerieElement.addEventListener(
    "wheel",
    (event) => {
      const canScroll = galerieElement.scrollWidth > galerieElement.clientWidth;

      if (!canScroll || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;   // kein Band (Handy) oder Touchpad scrollt schon seitlich
      }

      const atStart = galerieElement.scrollLeft <= 0;
      const atEnd =
        galerieElement.scrollLeft + galerieElement.clientWidth >= galerieElement.scrollWidth - 1;

      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) {
        return;
      }

      event.preventDefault();
      galerieElement.scrollLeft += event.deltaY;
    },
    { passive: false }
  );
}

// ---------- Vollbild ----------
// Klick auf ein Bild (Slideshow oder Galerie) zeigt es bildschirmfüllend.
// Schließen: Klick irgendwo, Esc-Taste oder ×.
// Videos haben ihren eigenen Vollbild-Knopf in der Video-Steuerung.

const viewerElement = document.getElementById("viewer");
const viewerImage = document.getElementById("viewer_image");

function openViewer(image) {
  clearTimeout(timer);   // Slideshow anhalten, solange das Bild offen ist

  viewerImage.src = image.src;
  viewerImage.alt = image.alt;
  viewerElement.hidden = false;
  document.documentElement.classList.add("viewer_open");

  // Echter Vollbildmodus, wo der Browser ihn erlaubt (am iPhone nicht –
  // dort füllt die Ansicht trotzdem den ganzen Bildschirm)
  if (viewerElement.requestFullscreen) {
    viewerElement.requestFullscreen().catch(() => {});
  }
}

function closeViewer() {
  if (viewerElement.hidden) {
    return;
  }

  viewerElement.hidden = true;
  document.documentElement.classList.remove("viewer_open");

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  // Slideshow weiterlaufen lassen, wenn gerade ein Bild gezeigt wird
  if (slides[currentSlide] && slides[currentSlide].type !== "video") {
    startTimer(5000);
  }
}

function setupViewer() {
  [slideContent, galerieElement].forEach((container) => {
    container.addEventListener("click", (event) => {
      if (event.target.tagName === "IMG") {
        openViewer(event.target);
      }
    });
  });

  viewerElement.addEventListener("click", closeViewer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeViewer();
    }
  });

  // Esc im echten Vollbildmodus beendet ihn, ohne ein keydown auszulösen
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      closeViewer();
    }
  });
}

// ---------- Laden ----------

function showError(message) {
  titelElement.textContent = "exhibition not found";
  descriptionElement.textContent = message;
  slideshowElement.hidden = true;
}

function showExhibition(exhibition) {
  document.title = exhibition.titel + " – Tripnjungle";

  titelElement.textContent = exhibition.titel;
  themeElement.textContent = exhibition.theme || "";
  descriptionElement.textContent = exhibition.description || "";

  setupSlideshow(exhibition);
  setupGalerie(exhibition);
  setupViewer();
}

async function loadExhibition() {
  const id = new URLSearchParams(window.location.search).get("id");

  // Nur einfache ids erlauben, damit niemand beliebige Pfade laden kann
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    showError("Keine gültige Ausstellung angegeben.");
    return;
  }

  try {
    const response = await fetch("data/exhibitions/" + id + ".json");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    showExhibition(await response.json());
  } catch (error) {
    showError("Die Ausstellung „" + id + "“ konnte nicht geladen werden.");
    console.error(error);
  }
}

loadExhibition();
