// Exhibitions: Raster aller freigeschalteten Ausstellungen (locked: false).
// Jede Karte zeigt das Deckblatt, den Titel und das Thema.
// Klick → Intro-Video (intro.js), danach die Ausstellung.

const listElement = document.getElementById("list");

function createCard(exhibition) {
  const card = document.createElement("a");
  const frontPage = exhibition.front_page;

  card.className = "card";
  card.href = getExhibitionLink(exhibition);

  if (frontPage?.type === "video") {
    const video = document.createElement("video");

    video.src = frontPage.src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    card.appendChild(video);
  } else if (frontPage?.src) {
    const image = document.createElement("img");

    image.src = frontPage.src;
    image.alt = frontPage.alt || exhibition.titel;
    image.loading = "lazy";
    card.appendChild(image);
  } else {
    const placeholder = document.createElement("div");

    placeholder.className = "card_placeholder";
    card.appendChild(placeholder);
  }

  const title = document.createElement("h2");

  title.className = "card_title";
  title.textContent = exhibition.titel;
  card.appendChild(title);

  if (exhibition.theme) {
    const theme = document.createElement("p");

    theme.className = "card_theme";
    theme.textContent = exhibition.theme;
    card.appendChild(theme);
  }

  return card;
}

async function startExhibitions() {
  let exhibitions;

  try {
    exhibitions = await loadExhibitions();
  } catch (error) {
    listElement.textContent = "Ausstellungen konnten nicht geladen werden.";
    console.error(error);
    return;
  }

  const open = exhibitions
    .filter((exhibition) => !isLocked(exhibition))
    .map(resolveFrontPage);

  if (open.length === 0) {
    listElement.textContent = "Noch keine Ausstellungen freigeschaltet.";
    return;
  }

  open.forEach((exhibition) => {
    listElement.appendChild(createCard(exhibition));
  });
}

startExhibitions();
