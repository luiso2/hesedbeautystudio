import { EN } from "./i18n.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const ES = {};
$$("[data-i18n]").forEach((el) => {
  ES[el.dataset.i18n] ??= el.innerHTML;
});
let lang = "es";
// Video playback is an explicit site preference, separate from decorative motion.
let videosPaused = false;
try {
  videosPaused = localStorage.getItem("hesed-videos-paused") === "true";
} catch {}
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
  $(".category-strip").setAttribute(
    "aria-label",
    copy("Categorías de tratamientos", "Treatment categories"),
  );
  $(".tabs").setAttribute("aria-label", copy("Tratamientos", "Treatments"));
  $(".lang").setAttribute("aria-label", copy("Idioma", "Language"));
  $(".hero__video").setAttribute(
    "aria-label",
    copy("Masaje en Hesed Beauty Studio", "Massage at Hesed Beauty Studio"),
  );
  updateMenuLabel();
  updateShowMore();
  updateMotionButton();
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

// Accessible tabs, roving focus and progressive disclosure of the full catalog.
const tabs = $$(".tab");
const panels = $$(".panel");
const showMore = $("#show-treatments");
const expanded = new Set();
function updateShowMore() {
  const panel = $(".panel.is-active");
  const cards = $$(".card", panel);
  const isExpanded = expanded.has(panel.dataset.panel);
  cards.forEach((card, index) => {
    card.hidden = cards.length > 3 && !isExpanded && index >= 3;
  });
  showMore.hidden = cards.length <= 3;
  showMore.setAttribute("aria-controls", panel.id);
  showMore.setAttribute("aria-expanded", String(isExpanded));
  showMore.textContent = isExpanded
    ? copy("Ver menos tratamientos −", "Show fewer treatments −")
    : copy(
        `Ver los ${cards.length} tratamientos +`,
        `View all ${cards.length} treatments +`,
      );
}
function selectTab(key, focus = false) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  });
  panels.forEach((panel) => {
    const active = panel.dataset.panel === key;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
    if (!active) $$("video", panel).forEach((video) => video.pause());
  });
  updateShowMore();
}
tabs.forEach((tab, index) => {
  tab.id = `tab-${tab.dataset.tab}`;
  tab.setAttribute("aria-controls", `panel-${tab.dataset.tab}`);
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectTab(tabs[next].dataset.tab, true);
    }
  });
});
panels.forEach((panel) => {
  panel.id = `panel-${panel.dataset.panel}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `tab-${panel.dataset.panel}`);
  panel.tabIndex = 0;
});
showMore.addEventListener("click", () => {
  const panel = $(".panel.is-active");
  const key = panel.dataset.panel;
  if (expanded.has(key)) {
    expanded.delete(key);
    updateShowMore();
    $(".tabs").scrollIntoView({
      behavior: motionPreference.matches ? "instant" : "smooth",
      block: "start",
    });
    $(".tab.is-active").focus({ preventScroll: true });
  } else {
    expanded.add(key);
    updateShowMore();
    // Move keyboard focus into the newly revealed content.
    const firstNew = $$(".card", panel)[3];
    firstNew.tabIndex = -1;
    firstNew.focus({ preventScroll: true });
  }
});
$$("[data-category]").forEach((link) =>
  link.addEventListener("click", () => selectTab(link.dataset.category)),
);
selectTab("corporal");

// Play every visible video on desktop and touch; pause offscreen media.
const visibleVideos = new Set();
const videos = $$("video");
function play(video) {
  if (videosPaused || document.hidden || !video.getClientRects().length) return;
  video.muted = true;
  video.playsInline = true;
  video
    .play()
    .then(() => {
      // An observer or a tab change may have paused playback while play() resolved.
      if (
        videosPaused ||
        document.hidden ||
        !visibleVideos.has(video) ||
        !video.getClientRects().length
      )
        video.pause();
      else video.controls = false;
    })
    .catch((error) => {
      // Browser autoplay restrictions need a real, accessible playback control.
      if (error.name === "NotAllowedError") video.controls = true;
    });
}
const videoObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
        visibleVideos.add(entry.target);
        play(entry.target);
      } else {
        visibleVideos.delete(entry.target);
        entry.target.pause();
      }
    }),
  { threshold: [0, 0.15] },
);
videos.forEach((video) => videoObserver.observe(video));
function updateMotionButton() {
  const button = $(".motion-toggle");
  button.setAttribute("aria-pressed", String(videosPaused));
  button.innerHTML = `<span aria-hidden="true">${videosPaused ? "▷" : "Ⅱ"}</span><span>${videosPaused ? copy("Reproducir videos", "Play videos") : copy("Pausar videos", "Pause videos")}</span>`;
}
function syncVideos() {
  videos.forEach((video) => {
    if (videosPaused || document.hidden) video.pause();
    else if (visibleVideos.has(video)) play(video);
  });
  updateMotionButton();
}
$(".motion-toggle").addEventListener("click", () => {
  videosPaused = !videosPaused;
  try {
    localStorage.setItem("hesed-videos-paused", String(videosPaused));
  } catch {}
  syncVideos();
});
document.addEventListener("visibilitychange", syncVideos);
$("#year").textContent = new Date().getFullYear();
let savedLang = "es";
try {
  savedLang = localStorage.getItem("hesed-lang") || "es";
} catch {
  /* Keep Spanish default. */
}
setLang(savedLang);
