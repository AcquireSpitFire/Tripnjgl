// Intro-Video vor einer Ausstellung.
//
// Jeder Link zu exhibition.html?id=… wird abgefangen. Statt direkt zur
// Ausstellung zu springen, öffnet sich ein Overlay mit dem YouTube-Video
// der Ausstellung (Feld "video" in der JSON). Darunter steht der Knopf
// „Weiter zur Ausstellung“ – aber nur, wenn die Ausstellung freigeschaltet
// ist (locked: false). Ist das Video zu Ende, geht es automatisch weiter.
//
// Warum ein Overlay und keine eigene Seite: Browser erlauben Autoplay mit
// Ton nur nach einem Klick auf derselben Seite. Der Klick auf das Poster
// ist dieser Klick; eine neue Seite hätte ihn nicht, das Intro liefe stumm.
//
// Hinweis zur Qualität: 1080p wird angefordert (vq + setPlaybackQuality),
// YouTube entscheidet aber selbst, was es tatsächlich abspielt.

(function () {
  let overlayElement = null;
  let player = null;
  let apiPromise = null;

  // YouTube IFrame Player API einmalig nachladen
  function loadYouTubeApi() {
    if (window.YT?.Player) {
      return Promise.resolve();
    }

    if (!apiPromise) {
      apiPromise = new Promise((resolve) => {
        const previous = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = () => {
          previous?.();
          resolve();
        };

        const script = document.createElement("script");

        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      });
    }

    return apiPromise;
  }

  function closeIntro() {
    if (!overlayElement) {
      return;
    }

    player?.destroy();
    player = null;
    overlayElement.remove();
    overlayElement = null;
    document.documentElement.classList.remove("intro_open");

    // Startseite: Slideshow weiterlaufen lassen
    window.resumeSlideshow?.();
  }

  function goToExhibition(exhibition) {
    location.href = getExhibitionLink(exhibition);
  }

  function buildOverlay(exhibition, videoId) {
    const overlay = document.createElement("div");

    overlay.id = "intro";
    overlay.className = "intro";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Intro: " + exhibition.titel);

    const close = document.createElement("button");

    close.className = "intro_close";
    close.type = "button";
    close.setAttribute("aria-label", "Schließen");
    close.textContent = "×";
    close.addEventListener("click", closeIntro);

    const inner = document.createElement("div");

    inner.className = "intro_inner";

    if (videoId) {
      const box = document.createElement("div");
      const target = document.createElement("div");

      box.className = "intro_player_box";
      target.id = "intro_player";
      box.appendChild(target);
      inner.appendChild(box);
    }

    const title = document.createElement("p");

    title.className = "intro_title";
    title.textContent = exhibition.titel;
    inner.appendChild(title);

    const actions = document.createElement("div");

    actions.className = "intro_actions";

    if (isLocked(exhibition)) {
      const note = document.createElement("p");

      note.className = "intro_locked";
      note.textContent = "Diese Ausstellung ist noch nicht freigeschaltet.";
      actions.appendChild(note);
    } else {
      const button = document.createElement("a");

      button.className = "intro_button";
      button.href = getExhibitionLink(exhibition);
      button.textContent = "Weiter zur Ausstellung ›";
      actions.appendChild(button);
    }

    inner.appendChild(actions);
    overlay.appendChild(close);
    overlay.appendChild(inner);

    // Klick auf den dunklen Hintergrund schließt
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeIntro();
      }
    });

    return overlay;
  }

  async function startPlayer(exhibition, videoId) {
    await loadYouTubeApi();

    // Overlay wurde inzwischen geschlossen
    if (!overlayElement || !document.getElementById("intro_player")) {
      return;
    }

    const playerVars = {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      vq: "hd1080",
    };

    // "origin" schützt die API-Verbindung, geht aber nur bei http(s)
    if (/^https?:$/.test(location.protocol)) {
      playerVars.origin = location.origin;
    }

    player = new YT.Player("intro_player", {
      videoId,
      host: "https://www.youtube-nocookie.com",
      width: "100%",
      height: "100%",
      playerVars,
      events: {
        onReady: (event) => {
          event.target.setPlaybackQuality("hd1080");
          event.target.playVideo();
        },
        onStateChange: (event) => {
          // Video zu Ende → weiter zur Ausstellung (nur wenn freigeschaltet)
          if (event.data === YT.PlayerState.ENDED && !isLocked(exhibition)) {
            goToExhibition(exhibition);
          }
        },
      },
    });
  }

  async function openIntro(id) {
    let exhibition;

    try {
      exhibition = await getExhibition(id);
    } catch (error) {
      console.error("Ausstellung „" + id + "“ konnte nicht geladen werden.", error);
      location.href = "exhibition.html?id=" + encodeURIComponent(id);
      return;
    }

    const videoId = getYouTubeId(exhibition.video);

    // Kein Video und freigeschaltet: direkt zur Ausstellung, kein leeres Overlay
    if (!videoId && !isLocked(exhibition)) {
      goToExhibition(exhibition);
      return;
    }

    if (!videoId && exhibition.video) {
      console.warn("Keine YouTube-ID erkannt bei „" + id + "“:", exhibition.video);
    }

    closeIntro();
    window.pauseSlideshow?.();

    overlayElement = buildOverlay(exhibition, videoId);
    document.body.appendChild(overlayElement);
    document.documentElement.classList.add("intro_open");

    if (videoId) {
      startPlayer(exhibition, videoId);
    }
  }

  // Alle Links zur Ausstellung abfangen (auch solche, die erst später
  // ins DOM kommen, z. B. Poster und Slideshow)
  document.addEventListener("click", (event) => {
    // Neue Tabs per Strg/Cmd/Mittelklick weiter erlauben
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const anchor = event.target.closest?.('a[href*="exhibition.html?id="]');

    if (!anchor) {
      return;
    }

    const id = new URL(anchor.href, location.href).searchParams.get("id");

    if (!id) {
      return;
    }

    event.preventDefault();
    openIntro(id);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeIntro();
    }
  });
})();
