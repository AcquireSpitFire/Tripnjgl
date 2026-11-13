// Intro-Video vor einer Ausstellung.
//
// Nur Links mit data-intro (Poster, siehe createPosterElement in data.js)
// werden abgefangen. Statt direkt zur Ausstellung zu springen, öffnet sich
// ein Overlay mit dem YouTube-Video der Ausstellung (Feld "video").
// Darunter steht der Knopf „Continue to exhibition“. Ist das Video zu Ende,
// geht es automatisch weiter. Slides, Karten und Textlinks führen direkt
// zur Ausstellung.
//
// Datenschutz: Vor dem ersten Kontakt zu YouTube/Google muss der Besucher
// zustimmen (Hinweiskarte im Overlay, siehe createYouTubeNotice in data.js).
// Die Zustimmung wird im Browser gemerkt. Erst mit gespeicherter Zustimmung
// wird die YouTube-API im Leerlauf bzw. beim Berühren eines Posters vorgeladen.
//
// Schnell: Sobald das Overlay offen ist, werden die Daten und ersten Bilder
// der Ausstellung (eigener Server) vorgeladen, sodass die Ausstellungsseite
// danach sofort da ist.
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
  const prefetched = new Set();

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
        script.async = true;
        document.head.appendChild(script);
      });
    }

    return apiPromise;
  }

  // API im Leerlauf vorladen, sobald die Seite Poster mit Video enthält –
  // nur mit gespeicherter Zustimmung. Poster entstehen erst nach dem
  // API-Aufruf, deshalb per MutationObserver.
  function warmUpWhenPostersAppear() {
    if (!hasYouTubeConsent()) {
      return;
    }

    const start = () => {
      const idle = window.requestIdleCallback || ((callback) => setTimeout(callback, 1500));

      idle(() => loadYouTubeApi());
    };

    if (document.querySelector("a[data-intro]")) {
      start();
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector("a[data-intro]")) {
        observer.disconnect();
        start();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Ausstellung im Hintergrund holen: Daten in den sessionStorage,
  // erste Bilder in den Browser-Cache, Seite per prefetch
  async function prefetchExhibition(exhibition) {
    if (prefetched.has(exhibition.id) || isLocked(exhibition)) {
      return;
    }

    prefetched.add(exhibition.id);

    const link = document.createElement("link");

    link.rel = "prefetch";
    link.href = getExhibitionLink(exhibition);
    document.head.appendChild(link);

    try {
      const full = await loadExhibition(exhibition.id);

      preloadExhibitionImages(full, 6);
    } catch (error) {
      console.warn("Prefetch failed for “" + exhibition.id + "”", error);
    }
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
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", closeIntro);

    const inner = document.createElement("div");

    inner.className = "intro_inner";

    if (videoId) {
      const box = document.createElement("div");

      box.className = "intro_player_box";

      if (hasYouTubeConsent()) {
        box.appendChild(createPlayerTarget());
      } else {
        box.appendChild(
          createYouTubeNotice({
            cover: exhibition.posters?.[0] || resolveFrontPage(exhibition).front_page,
            onPlay: () => {
              box.innerHTML = "";
              box.appendChild(createPlayerTarget());
              startPlayer(exhibition, videoId);
            },
          })
        );
      }

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
      note.textContent = "This exhibition is not available yet.";
      actions.appendChild(note);
    } else {
      const button = document.createElement("button");

      button.className = "intro_button";
      button.type = "button";
      button.textContent = "Continue to exhibition ›";
      button.addEventListener("click", () => {
        closeIntro();
        goToExhibition(exhibition);
      });
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

  function createPlayerTarget() {
    const target = document.createElement("div");

    target.id = "intro_player";

    return target;
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
          if (event.data === YT.PlayerState.ENDED && !isLocked(exhibition)) {
            goToExhibition(exhibition);
          }
        },
        onError: (event) => {
          showPlayerError(event.data);
        },
      },
    });
  }

  // YouTube konnte das Video nicht abspielen: Grund statt schwarzem Feld anzeigen.
  // Codes: 2 = ungültige ID, 5 = Player-Fehler, 100 = nicht gefunden/privat,
  // 101/150 = Einbetten vom Besitzer nicht erlaubt
  function showPlayerError(code) {
    const box = overlayElement?.querySelector(".intro_player_box");

    if (!box) {
      return;
    }

    const reasons = {
      2: "The video ID is invalid.",
      100: "The video was not found or is private.",
      101: "The owner does not allow embedding this video (YouTube Studio → video → “Allow embedding”).",
      150: "The owner does not allow embedding this video (YouTube Studio → video → “Allow embedding”).",
    };

    const message = document.createElement("p");

    message.className = "intro_error";
    message.textContent =
      "The video cannot be played (YouTube error " + code + "). " + (reasons[code] || "");

    box.innerHTML = "";
    box.appendChild(message);
    console.error("YouTube error", code);
  }

  async function openIntro(id) {
    let exhibition;

    try {
      exhibition = await getExhibition(id);
    } catch (error) {
      console.error("Exhibition “" + id + "” could not be loaded.", error);
      location.href = "/exhibition/" + encodeURIComponent(id);
      return;
    }

    const videoId = getYouTubeId(exhibition.video);

    // Kein Video und freigeschaltet: direkt zur Ausstellung, kein leeres Overlay
    if (!videoId && !isLocked(exhibition)) {
      goToExhibition(exhibition);
      return;
    }

    closeIntro();
    window.pauseSlideshow?.();

    overlayElement = buildOverlay(exhibition, videoId);
    document.body.appendChild(overlayElement);
    document.documentElement.classList.add("intro_open");

    // Ausstellung (eigener Server) schon laden, während Hinweis oder Video zu sehen ist
    prefetchExhibition(exhibition);

    if (videoId && hasYouTubeConsent()) {
      startPlayer(exhibition, videoId);
    }
  }

  // Nur Poster-Links (data-intro) abfangen, auch solche, die erst später
  // ins DOM kommen
  document.addEventListener("click", (event) => {
    // Neue Tabs per Strg/Cmd/Mittelklick weiter erlauben
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const anchor = event.target.closest?.("a[data-intro]");

    if (!anchor || anchor.closest("#intro")) {
      return;
    }

    const id = anchor.dataset.id;

    if (!id) {
      return;
    }

    event.preventDefault();
    openIntro(id);
  });

  // Zeigt die Maus auf ein Poster (oder Finger berührt es): API jetzt laden,
  // sofern der Besucher YouTube schon zugestimmt hat
  ["pointerenter", "touchstart", "focusin"].forEach((type) => {
    document.addEventListener(
      type,
      (event) => {
        if (hasYouTubeConsent() && event.target.closest?.("a[data-intro]")) {
          loadYouTubeApi();
        }
      },
      { capture: true, passive: true }
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeIntro();
    }
  });

  warmUpWhenPostersAppear();
})();
