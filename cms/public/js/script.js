// Startseite. Die Ausstellungen werden über data.js geladen:
// jede freigeschaltete Ausstellung ist ein Slide mit ihrem Deckblatt.
// Gibt es eine kommende Ausstellung mit Poster, steht ihr Poster über der Slideshow.
// Klicks auf Poster/Slides fängt intro.js ab (Intro-Video vor der Ausstellung).
let slides = [];

let currentSlide = 0;
let timer;

const slideContent = document.getElementById("slide_content");
const dotsContainer = document.getElementById("dots");
const posterContainer = document.getElementById("front_poster");

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
    // Ein Video mit Fokus nutzt die Pfeiltasten selbst zum Spulen,
    // und solange das Intro offen ist, bleibt die Slideshow stehen
    if (event.target.tagName === "VIDEO" || document.getElementById("intro")) {
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

// Für intro.js: Slideshow anhalten, solange das Intro-Video läuft
window.pauseSlideshow = () => {
  clearTimeout(timer);
  slideContent.querySelector("video")?.pause();
};

window.resumeSlideshow = () => {
  if (slides.length === 0) {
    return;
  }

  const video = slideContent.querySelector("video");

  if (video) {
    video.play().catch(() => {});
  } else {
    startTimer(5000);
  }
};

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

// Die Ausstellung mit dem frühesten Datum ab heute,
// bei gleichem Datum die mit der geringsten Nummer
function findNextExhibition(exhibitions) {
  const today = getToday();

  const upcoming = exhibitions
    .filter((exhibition) => exhibition.posters?.[0]?.src)
    .filter((exhibition) => isUpcoming(exhibition, today))
    .sort(compareByDate);

  return upcoming[0];
}

// Das Poster nimmt den Platz der Slideshow ein, die Slideshow rutscht
// darunter. Die Seite passt dann nicht mehr auf einen Bildschirm und scrollt.
function showPoster(exhibition) {
  posterContainer.appendChild(createPosterElement(exhibition, exhibition.posters[0]));
  posterContainer.hidden = false;
  document.documentElement.classList.replace("fit", "has_poster");
}

// Alle kommenden Poster unter der Slideshow, nach Datum sortiert.
// Das Poster, das schon oben über der Slideshow steht, wird ausgelassen.
function showUpcomingPosters(exhibitions, shownPoster) {
  const container = document.getElementById("upcoming_posters");
  const today = getToday();
  const upcoming = exhibitions
    .filter((exhibition) => exhibition.posters?.length && isUpcoming(exhibition, today))
    .sort(compareByDate);

  upcoming.forEach((exhibition) => {
    exhibition.posters.forEach((poster) => {
      if (!poster.src || poster === shownPoster) {
        return;
      }

      const element = createPosterElement(exhibition, poster);
      const caption = document.createElement("p");

      element.querySelector("img").loading = "lazy";
      caption.className = "upcoming_caption";
      caption.textContent = exhibition.titel + " · " + formatDate(exhibition);

      element.appendChild(caption);
      container.appendChild(element);
    });
  });

  container.hidden = container.childElementCount === 0;
}

// ---------- Laden ----------

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

  showUpcomingPosters(exhibitions, nextExhibition?.posters[0]);

  // In der Slideshow nur freigeschaltete Ausstellungen: gesperrte sind
  // über ihr Poster sichtbar, ihr Deckblatt soll noch nicht zu sehen sein
  slides = exhibitions
    .filter((exhibition) => !isLocked(exhibition))
    .map(resolveFrontPage);

  if (slides.length === 0) {
    slideContent.textContent = "Noch keine Ausstellungen freigeschaltet.";
    return;
  }

  document.getElementById("next").addEventListener("click", nextSlide);
  document.getElementById("prev").addEventListener("click", previousSlide);
  setupSwipe();
  setupKeys();

  showSlide(0);
}

start();
