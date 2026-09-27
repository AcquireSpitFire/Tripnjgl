// Zeigt eine Ausstellung an. Welche, steht in der URL:
// ausstellung.html?id=ausstellung-1  →  lädt data/ausstellungen/ausstellung-1.json

const titelElement = document.getElementById("titel");
const themeElement = document.getElementById("theme");
const beschreibungElement = document.getElementById("beschreibung");
const deckblattElement = document.getElementById("deckblatt");
const galerieElement = document.getElementById("galerie");

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

function showError(message) {
  titelElement.textContent = "Ausstellung nicht gefunden";
  beschreibungElement.textContent = message;
}

function showAusstellung(ausstellung) {
  document.title = ausstellung.titel + " – Tripnjungle";

  titelElement.textContent = ausstellung.titel;
  themeElement.textContent = ausstellung.theme || "";
  beschreibungElement.textContent = ausstellung.beschreibung || "";

  if (ausstellung.deckblatt) {
    deckblattElement.appendChild(createMedia(ausstellung.deckblatt));
  }

  (ausstellung.medien || []).forEach((item) => {
    const media = createMedia(item);

    // Jedes Foto/Video hat eine id, z. B. für Links wie ausstellung.html?id=...#ausstellung-1-2
    if (item.id) {
      media.id = item.id;
    }

    galerieElement.appendChild(media);
  });
}

async function loadAusstellung() {
  const id = new URLSearchParams(window.location.search).get("id");

  // Nur einfache ids erlauben, damit niemand beliebige Pfade laden kann
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    showError("Keine gültige Ausstellung angegeben.");
    return;
  }

  try {
    const response = await fetch("data/ausstellungen/" + id + ".json");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    showAusstellung(await response.json());
  } catch (error) {
    showError("Die Ausstellung „" + id + "“ konnte nicht geladen werden.");
    console.error(error);
  }
}

loadAusstellung();
