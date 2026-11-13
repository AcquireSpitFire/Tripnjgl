// Zeigt eine Ausstellung an. Welche, steht in der URL:
// /exhibition/exhibition-1  →  Ausstellung mit slug "exhibition-1"
// (alte Form exhibition.html?id=… wird vom Server weitergeleitet).
//
// Oben: Slideshow mit Deckblatt + allen Bildern/Videos.
// Darunter: Beschreibung, Galerie mit allen Bildern/Videos
// (Handy: untereinander, Desktop: seitlich scrollbares Band) und ganz
// unten das Intro-Video zum erneuten Anschauen.
// Gesperrte Ausstellungen (locked: true) zeigen nur einen Hinweis.
// Die Daten kommen aus dem sessionStorage (von intro.js vorgeladen) oder der API.

const titelElement = document.getElementById("titel");
const themeElement = document.getElementById("theme");
const descriptionElement = document.getElementById("description");
const slideshowElement = document.getElementById("slideshow");
const slideContent = document.getElementById("slide_content");
const dotsContainer = document.getElementById("dots");
const galerieElement = document.getElementById("galerie");
const videoSection = document.getElementById("video");
const videoBox = document.getElementById("video_box");

let slides = [];
let currentSlide = 0;
let timer;

// Name eines Bildes/Videos: "name" aus der JSON, sonst der alt-Text
function getName(item) {
  return item.name || item.alt || "";
}

function createMedia(item, options = {}) {
  if (item.type === "video") {
    const video = document.createElement("video");

    video.src = item.src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    return video;
  }

  const image = document.createElement("img");

  setImageSources(image, item, {
    size: "medium",
    sizes: "(max-width: 600px) 100vw, min(1200px, 90vw)",
    lazy: true,
    ...options,
  });
  image.alt = item.alt || "";

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
    // das sichtbare Bild sofort laden
    const image = createMedia(item, { lazy: false, priority: index === 0 });

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
    dot.setAttribute("aria-label", `Image ${index + 1}`);

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

    figure.appendChild(
      createMedia(item, { sizes: "(max-width: 600px) 100vw, 480px" })
    );

    if (name) {
      const caption = document.createElement("figcaption");

      caption.className = "caption";
      caption.textContent = name;
      figure.appendChild(caption);
    }

    // Jedes Foto/Video hat eine id, z. B. für Links wie /exhibition/…#123
    if (item.id) {
      figure.id = "media-" + item.id;
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
// Klick auf ein Bild (Slideshow oder Galerie) zeigt es bildschirmfüllend
// in der großen Version (2560 px). Schließen: Klick irgendwo, Esc-Taste oder ×.
// Videos haben ihren eigenen Vollbild-Knopf in der Video-Steuerung.

const viewerElement = document.getElementById("viewer");
const viewerImage = document.getElementById("viewer_image");

// Welches Medium steckt hinter einem <img>? (über die URL der mittleren Größe)
function findMediaForImage(image, exhibition) {
  const all = [exhibition.front_page, ...(exhibition.medien || [])].filter(Boolean);

  return all.find((item) => image.currentSrc === item.src || image.src === item.src
    || Object.values(item.sizes || {}).some((size) => size.url === image.currentSrc || size.url === image.src));
}

let currentExhibition = null;

function openViewer(image) {
  clearTimeout(timer);   // Slideshow anhalten, solange das Bild offen ist

  const media = currentExhibition && findMediaForImage(image, currentExhibition);

  viewerImage.removeAttribute("srcset");
  viewerImage.removeAttribute("sizes");

  if (media) {
    setImageSources(viewerImage, media, { size: "large", sizes: "100vw" });
  } else {
    viewerImage.src = image.src;
  }

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
  titelElement.textContent = "Exhibition not found";
  descriptionElement.textContent = message;
  slideshowElement.hidden = true;
}

// Gesperrte Ausstellung: Titel, aber keine Bilder
function showLocked(exhibition) {
  document.title = exhibition.titel + " – Tripnjungle";

  titelElement.textContent = exhibition.titel;
  themeElement.textContent = exhibition.theme || "";
  descriptionElement.textContent = "This exhibition is not available yet.";
  slideshowElement.hidden = true;
}

// Intro-Video der Ausstellung unter der Galerie einbetten.
// Ohne gespeicherte YouTube-Zustimmung erst eine Hinweiskarte (Deckblatt/Poster
// als Hintergrund, vom eigenen Server); der iframe kommt erst nach dem Klick.
function embedVideo(exhibition, videoId, autoplay) {
  const iframe = document.createElement("iframe");

  iframe.src =
    "https://www.youtube-nocookie.com/embed/" + videoId + "?rel=0" + (autoplay ? "&autoplay=1" : "");
  iframe.title = "Video: " + exhibition.titel;
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";

  videoBox.innerHTML = "";
  videoBox.appendChild(iframe);
}

function setupVideo(exhibition) {
  const videoId = getYouTubeId(exhibition.video);

  if (!videoId) {
    return;
  }

  if (hasYouTubeConsent()) {
    embedVideo(exhibition, videoId, false);
  } else {
    const cover = resolveFrontPage(exhibition).front_page || exhibition.posters?.[0];

    videoBox.appendChild(
      createYouTubeNotice({
        cover,
        onPlay: () => embedVideo(exhibition, videoId, true),
      })
    );
  }

  videoSection.hidden = false;
}

function showExhibition(exhibition) {
  currentExhibition = exhibition;

  if (isLocked(exhibition)) {
    showLocked(exhibition);
    return;
  }

  // Titel/Meta hat der Server schon gesetzt; hier nur den sichtbaren Inhalt
  titelElement.textContent = exhibition.titel;
  themeElement.textContent = exhibition.theme || "";
  descriptionElement.textContent = exhibition.description || "";

  setupSlideshow(exhibition);
  setupGalerie(exhibition);
  setupVideo(exhibition);
  setupViewer();
}

// id aus /exhibition/<id>, Fallback ?id=… (alte Links)
function getIdFromUrl() {
  const match = /^\/exhibition\/([^/?#]+)/.exec(window.location.pathname);

  if (match) {
    return decodeURIComponent(match[1]);
  }

  return new URLSearchParams(window.location.search).get("id");
}

async function startExhibition() {
  const id = getIdFromUrl();

  if (!isValidId(id)) {
    showError("No valid exhibition specified.");
    return;
  }

  try {
    showExhibition(await loadExhibition(id));
  } catch (error) {
    showError("The exhibition “" + id + "” could not be loaded.");
    console.error(error);
  }
}

startExhibition();
