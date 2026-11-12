// Navigation: Hamburger-Knopf (drei Striche) rechts oben im Header,
// darunter klappt das Menü auf. Das Markup wird hier erzeugt, damit es
// nur an einer Stelle gepflegt wird und auf jeder Seite gleich ist.

const MENU_ITEMS = [
  { label: "Startseite", href: "index.html" },
  { label: "Exhibitions", href: "exhibitions.html" },
  { label: "Events", href: "events.html" },
  { label: "Archive", href: "archive.html" },
  { label: "About", href: "about.html" },
];

function setupMenu() {
  const header = document.querySelector("header");

  if (!header) {
    return;
  }

  const headerInner = header.querySelector(".header_inner") || header;
  const toggle = document.createElement("button");

  toggle.className = "menu_toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Menü");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "menu");
  toggle.innerHTML = "<span></span><span></span><span></span>";

  const menu = document.createElement("nav");
  const list = document.createElement("ul");

  menu.id = "menu";
  menu.className = "menu";
  menu.hidden = true;

  // Aktuelle Seite: "index.html" oder "" (bei /) → Startseite
  const currentPage = location.pathname.split("/").pop() || "index.html";

  MENU_ITEMS.forEach((item) => {
    const entry = document.createElement("li");
    const link = document.createElement("a");

    link.href = item.href;
    link.textContent = item.label;

    if (item.href === currentPage) {
      link.setAttribute("aria-current", "page");
    }

    entry.appendChild(link);
    list.appendChild(entry);
  });

  menu.appendChild(list);
  headerInner.appendChild(toggle);
  header.appendChild(menu);

  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    setOpen(menu.hidden);
  });

  // Schließen: Esc, Klick außerhalb des Headers, Klick auf einen Link
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !header.contains(event.target)) {
      setOpen(false);
    }
  });

  menu.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      setOpen(false);
    }
  });
}

setupMenu();
