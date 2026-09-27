const slides = [
  {
    type: "image",
    src: "../data/image/000571250029.jpg",
    alt: "Landschaft"
  },
  {
    type: "image",
    src: "../data/image/000571250031.jpg",
    alt: "Stadtansicht"
  },
  {
    type: "video",
    src: "../data/video/PXL_20250109_214858313.TS.mp4"
  }
];



let currentSlide = 0;
let timer;

const slideContent = document.getElementById("slide_content");
//const dotsContainer = document.getElementById("dots");

function showSlide(index) {
  currentSlide = (index + slides.length) % slides.length;

  const slide = slides[currentSlide];

  slideContent.innerHTML = "";

  if (slide.type === "image") {
    const image = document.createElement("img");

    image.src = slide.src;
    image.alt = slide.alt || "";

    slideContent.appendChild(image);
    startTimer(5000);
  }

  if (slide.type === "video") {
    const video = document.createElement("video");

    video.src = slide.src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    slideContent.appendChild(video);

    // Nach dem Ende des Videos zum nächsten Slide wechseln
    video.addEventListener("ended", nextSlide);
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

document.getElementById("next").addEventListener("click", nextSlide);
document.getElementById("prev").addEventListener("click", previousSlide);

showSlide(0);