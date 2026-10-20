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

  updateDots();
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function previousSlide() {
  showSlide(currentSlide - 1);
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
  const frontPage = exhibition.front_page;
  const medien = exhibition.medien || [];

  slides = frontPage
    ? [frontPage, ...medien.filter((item) => item.src !== frontPage.src)]
    : medien.slice();

  if (slides.length === 0) {
    slideshowElement.hidden = true;
    return;
  }

  // Pfeile und Punkte nur, wenn es mehr als ein Bild gibt
  if (slides.length === 1) {
    slideshowElement.classList.add("single");
  }

  document.getElementById("next").addEventListener("click", nextSlide);
  document.getElementById("prev").addEventListener("click", previousSlide);

  showSlide(0);
}

// ---------- Galerie ----------

function setupGalerie(exhibition) {
  (exhibition.medien || []).forEach((item) => {
    const media = createMedia(item);

    // Jedes Foto/Video hat eine id, z. B. für Links wie exhibition.html?id=...#exhibition-1-2
    if (item.id) {
      media.id = item.id;
    }

    galerieElement.appendChild(media);
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
