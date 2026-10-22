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

  const exhibition = slides[currentSlide];
  const front_page = exhibition.front_page;
  const link = "exhibition.html?id=" + encodeURIComponent(exhibition.id);

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

async function loadSlides() {
  try {
    const response = await fetch("data/exhibitions/index.json");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const exhibitions = await response.json();
    slides = await Promise.all(exhibitions.map(async (exhibition) => {
      const frontPageReference = exhibition.front_page;

      if (!frontPageReference?.id || frontPageReference.src) {
        return exhibition;
      }

      try {
        const exhibitionResponse = await fetch(
          "data/exhibitions/" + encodeURIComponent(exhibition.id) + ".json"
        );

        if (!exhibitionResponse.ok) {
          throw new Error("HTTP " + exhibitionResponse.status);
        }

        const exhibitionData = await exhibitionResponse.json();
        const media = (exhibitionData.medien || []).find(
          (item) => item.id === frontPageReference.id
        );

        if (!media) {
          throw new Error("Deckblatt-Medium nicht gefunden: " + frontPageReference.id);
        }

        return { ...exhibition, front_page: media };
      } catch (error) {
        console.error("Deckblatt für „" + exhibition.id + "“ konnte nicht geladen werden.", error);
        return { ...exhibition, front_page: null };
      }
    }));
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
  setupSwipe();
  setupKeys();

  showSlide(0);
}

loadSlides();
