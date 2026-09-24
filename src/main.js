import { EN } from "./i18n.js";
import { initBooking } from "./booking.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ES = {};
$$("[data-i18n]").forEach((el) => {
  ES[el.dataset.i18n] ??= el.innerHTML;
});
let lang = "es";
let booking;
const copy = (es, en) => (lang === "en" ? en : es);

function setLang(next) {
  lang = next === "en" ? "en" : "es";
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => {
    const value = (lang === "en" ? EN : ES)[el.dataset.i18n];
    if (value != null) el.innerHTML = value;
  });
  $$(".lang__btn").forEach((button) => {
    const active = button.dataset.lang === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $(".nav__links").setAttribute(
    "aria-label",
    copy("Principal", "Main navigation"),
  );
  $(".category-choices").setAttribute(
    "aria-label",
    copy("Categorías de tratamientos", "Treatment categories"),
  );
  $(".lang").setAttribute("aria-label", copy("Idioma", "Language"));
  $(".hero__video").setAttribute(
    "aria-label",
    copy(
      "Masaje en María Hesed · Estética Avanzada",
      "Massage at María Hesed · Estética Avanzada",
    ),
  );
  updateMenuLabel();
  updateVideoButtons();
  updateCategoryButtons();
  booking?.refresh();
  try {
    localStorage.setItem("hesed-lang", lang);
  } catch {
    /* Storage may be unavailable. */
  }
}
$$(".lang__btn").forEach((button) =>
  button.addEventListener("click", () => setLang(button.dataset.lang)),
);

// The mobile navigation supports keyboard users and never leaves focus behind it.
const burger = $("#burger");
const menu = $("#menu");
let menuOpen = false;
function updateMenuLabel() {
  burger.setAttribute(
    "aria-label",
    menuOpen
      ? copy("Cerrar menú", "Close menu")
      : copy("Abrir menú", "Open menu"),
  );
}
function closeMenu(restoreFocus = false) {
  menuOpen = false;
  menu.classList.remove("is-open");
  menu.inert = true;
  menu.setAttribute("aria-hidden", "true");
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  $("main").inert = false;
  $(".footer").inert = false;
  updateMenuLabel();
  if (restoreFocus) burger.focus();
}
burger.addEventListener("click", () => {
  if (menuOpen) return closeMenu(true);
  menuOpen = true;
  menu.inert = false;
  menu.classList.add("is-open");
  menu.setAttribute("aria-hidden", "false");
  burger.classList.add("is-open");
  burger.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
  $("main").inert = true;
  $(".footer").inert = true;
  updateMenuLabel();
  $("a", menu).focus();
});
document.addEventListener("keydown", (event) => {
  if (!menuOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu(true);
  }
  if (event.key === "Tab") {
    const items = [
      ...$$("a[href], button", $("#nav")),
      ...$$("a[href]", menu),
    ].filter((el) => el.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
window.matchMedia("(min-width: 951px)").addEventListener("change", (event) => {
  if (event.matches && menuOpen) closeMenu(true);
});
$$('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", () => {
    if (menuOpen) {
      closeMenu();
      const target = $(link.getAttribute("href"));
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
  }),
);

// The category overview stays concise until a visitor requests the full list.
const categoryButtons = $$('[data-category-open]');
const panelGroup = $(".panels");
const detailHead = $(".services__detail-head");
const selectedTitle = $("#services-selected-title");
const panels = $$(".panel");
let selectedCategory = null;

function updateCategoryButtons() {
  categoryButtons.forEach((button) => {
    const active = button.dataset.categoryOpen === selectedCategory;
    const categoryName = button.closest(".category-choice").querySelector("h3").textContent.trim();
    button.setAttribute("aria-expanded", String(active));
    button.closest(".category-choice").classList.toggle("is-active", active);
    $(".category-choice__cta-label", button).textContent = active
      ? copy("Ocultar servicios y precios", "Hide services & prices")
      : copy("Ver servicios y precios", "View services & prices");
    button.setAttribute(
      "aria-label",
      `${active ? copy("Ocultar servicios y precios de", "Hide services & prices for") : copy("Ver servicios y precios de", "View services & prices for")} ${categoryName}`,
    );
  });
  if (selectedCategory) {
    selectedTitle.textContent = $(`[data-category-open="${selectedCategory}"]`)
      .closest(".category-choice")
      .querySelector("h3").textContent;
  }
}

function selectCategory(key) {
  selectedCategory = selectedCategory === key ? null : key;
  const isOpen = selectedCategory !== null;
  detailHead.hidden = !isOpen;
  panelGroup.hidden = !isOpen;
  panels.forEach((panel) => {
    const active = panel.dataset.panel === selectedCategory;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
    if (!active) $$("video", panel).forEach((video) => video.pause());
  });
  updateCategoryButtons();
  if (isOpen) {
    requestAnimationFrame(() =>
      detailHead.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      }),
    );
  }
}

categoryButtons.forEach((button) => {
  button.id = `category-${button.dataset.categoryOpen}`;
  button.closest(".category-choice").querySelector("h3").id =
    `category-title-${button.dataset.categoryOpen}`;
  button.addEventListener("click", () => selectCategory(button.dataset.categoryOpen));
});
panels.forEach((panel) => {
  panel.id = `panel-${panel.dataset.panel}`;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", `category-title-${panel.dataset.panel}`);
  panel.hidden = true;
});

// Treatment footage is optional: posters carry the page until a visitor asks to play.
const mediaButtons = [];
$$(".hero__media > video, .card__media video").forEach((video) => {
  const media = video.closest(".hero__media, .card__media");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-play";
  button.innerHTML = '<span class="media-play__icon" aria-hidden="true">▶</span><span class="media-play__label"></span>';
  media.append(button);
  mediaButtons.push({ button, video });
  button.addEventListener("click", async () => {
    // Lazy source loading prevents dozens of hidden treatment clips from downloading.
    const source = video.querySelector("source[data-src]");
    if (source) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
      video.load();
    }
    video.controls = true;
    button.hidden = true;
    try {
      await video.play();
    } catch {
      button.hidden = false;
    }
  });
});
function updateVideoButtons() {
  mediaButtons.forEach(({ button, video }) => {
    const name = video.closest(".card")?.querySelector("h3")?.textContent.trim();
    const label = name
      ? copy(`Ver video de ${name}`, `Play ${name} video`)
      : copy("Ver video de María Hesed", "Play María Hesed video");
    button.setAttribute("aria-label", label);
    button.querySelector(".media-play__label").textContent = copy("Ver video", "Play video");
  });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) $$("video").forEach((video) => video.pause());
});
$("#year").textContent = new Date().getFullYear();
let savedLang = "es";
try {
  savedLang = localStorage.getItem("hesed-lang") || "es";
} catch {
  /* Keep Spanish default. */
}
booking = initBooking(() => lang);
setLang(savedLang);
