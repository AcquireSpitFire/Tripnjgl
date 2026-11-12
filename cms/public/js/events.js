// Events und Archive (gleiche Darstellung, andere Auswahl):
//   <body data-page="events">  → Ausstellungen, die noch stattfinden (Datum ab heute),
//                                 aufsteigend sortiert, mit allen Details
//   <body data-page="archive"> → vergangene Ausstellungen, neueste zuerst
//
// Pro Ausstellung: alle Poster nebeneinander, Titel, Datum, Uhrzeit, Ort,
// Beschreibung und der Link zur Ausstellung (bei locked: nur ein Hinweis,
// Poster nicht klickbar). Klick auf Poster → Intro-Video (wenn vorhanden),
// Klick auf den Link → direkt zur Ausstellung.

const listElement = document.getElementById("list");
const isArchive = document.body.dataset.page === "archive";

function createPosters(exhibition, eventIndex) {
  const posters = document.createElement("div");

  posters.className = "event_posters";

  (exhibition.posters || []).forEach((poster, index) => {
    if (!poster.src) {
      return;
    }

    const element = createPosterElement(exhibition, poster, {
      altText: "Poster " + (index + 1) + ": " + exhibition.titel,
      size: "medium",
      sizes: "(max-width: 600px) 100vw, 24rem",
      lazy: eventIndex > 0 || index > 0,
      priority: eventIndex === 0 && index === 0,
    });

    posters.appendChild(element);
  });

  return posters;
}

function createEvent(exhibition, eventIndex) {
  const article = document.createElement("article");

  article.className = "event";
  article.id = exhibition.id;

  if (exhibition.posters?.length) {
    article.appendChild(createPosters(exhibition, eventIndex));
  }

  const info = document.createElement("div");

  info.className = "event_info";

  const title = document.createElement("h2");

  title.className = "event_title";
  title.textContent = exhibition.titel;
  info.appendChild(title);

  if (exhibition.theme) {
    const theme = document.createElement("p");

    theme.className = "event_theme";
    theme.textContent = exhibition.theme;
    info.appendChild(theme);
  }

  // Datum · Uhrzeit · Ort (nur was vorhanden ist)
  const details = [formatDate(exhibition)];

  if (!isArchive) {
    if (exhibition.time) {
      details.push(exhibition.time);
    }

    if (exhibition.location) {
      details.push(exhibition.location);
    }
  }

  const meta = document.createElement("p");

  meta.className = "event_meta";
  meta.textContent = details.filter(Boolean).join(" · ");
  info.appendChild(meta);

  if (!isArchive && exhibition.description) {
    const description = document.createElement("p");

    description.className = "event_description";
    description.textContent = exhibition.description;
    info.appendChild(description);
  }

  if (isLocked(exhibition)) {
    const note = document.createElement("p");

    note.className = "event_locked";
    note.textContent = "Not available yet";
    info.appendChild(note);
  } else {
    const link = document.createElement("a");

    link.className = "event_link";
    link.href = getExhibitionLink(exhibition);
    link.textContent = "View exhibition ›";
    info.appendChild(link);
  }

  article.appendChild(info);

  return article;
}

async function startEvents() {
  let exhibitions;

  try {
    exhibitions = await loadExhibitions();
  } catch (error) {
    listElement.textContent = "Exhibitions could not be loaded.";
    console.error(error);
    return;
  }

  const today = getToday();
  const selected = isArchive
    ? exhibitions.filter((exhibition) => isPast(exhibition, today)).sort(compareByDate).reverse()
    : exhibitions.filter((exhibition) => isUpcoming(exhibition, today)).sort(compareByDate);

  if (selected.length === 0) {
    listElement.textContent = isArchive ? "Nothing in the archive yet." : "No upcoming events.";
    return;
  }

  selected.forEach((exhibition, index) => {
    listElement.appendChild(createEvent(exhibition, index));
  });
}

startEvents();
