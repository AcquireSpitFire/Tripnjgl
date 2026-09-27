// Die Slides werden aus data/ausstellungen/index.json geladen:
// jede Ausstellung ist ein Slide mit ihrem Deckblatt.
let slides = [];

let currentSlide = 0;
let timer;

const slideContent = document.getElementById("slide_content");
const dotsContainer = document.getElementById("dots");

function showSlide(index) {
  clearTimeout(timer);
  currentSlide = (index + slides.length) % slides.length;

  const ausstellung = slides[currentSlide];
  const deckblatt = ausstellung.deckblatt;
  const link = "ausstellung.html?id=" + encodeURIComponent(ausstellung.id);

  slideContent.innerHTML = "";

  if (deckblatt.type === "image") {
    // Das ganze Bild ist ein Link zur Ausstellung
    const anchor = document.createElement("a");
    anchor.href = link;

    const image = document.createElement("img");

    image.src = deckblatt.src;
    image.alt = deckblatt.alt || ausstellung.titel;

    anchor.appendChild(image);
    slideContent.appendChild(anchor);
    startTimer(5000);
  }

  if (deckblatt.type === "video") {
    const video = document.createElement("video");

    video.src = deckblatt.src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    slideContent.appendChild(video);

    // Nach dem Ende des Videos zum nächsten Slide wechseln
    video.addEventListener("ended", nextSlide);
  }

  // Titel als Link unter jedem Slide (bei Videos der einzige Link,
  // weil die Video-Steuerung Klicks auf das Video selbst abfängt)
  const titleLink = document.createElement("a");
  titleLink.href = link;
  titleLink.className = "slide_link";
  titleLink.textContent = ausstellung.titel + " – zur Ausstellung ›";
  slideContent.appendChild(titleLink);

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

async function loadSlides() {
  try {
    const response = await fetch("data/ausstellungen/index.json");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    slides = await response.json();
  } catch (error) {
    slideContent.textContent = "Ausstellungen konnten nicht geladen werden.";
    console.error(error);
    return;
  }

  if (slides.length === 0) {
    slideContent.textContent = "Noch keine Ausstellungen vorhanden.";
    return;
  }

  document.getElementById("next").addEventListener("click", nextSlide);
  document.getElementById("prev").addEventListener("click", previousSlide);

  showSlide(0);
}

loadSlides();
