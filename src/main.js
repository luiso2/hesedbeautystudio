import { EN } from "./i18n.js";
import { initGiftCardForm } from "./gift-card-form.js";
import { initSiteMotion } from "./site-motion.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ES = {};
$$("[data-i18n]").forEach((el) => {
  ES[el.dataset.i18n] ??= el.innerHTML;
});
let lang = "es";
const giftCards = initGiftCardForm(() => lang);
const motion = initSiteMotion();
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
      "Masaje en María Hesed · Aesthetic Studio",
      "Massage at María Hesed · Aesthetic Studio",
    ),
  );
  $(".svc-modal__close").setAttribute("aria-label", copy("Cerrar", "Close"));
  updateMenuLabel();
  updateCategoryButtons();
  updateResultsGallery();
  giftCards?.refreshLanguage();
  $$(".media-toggle").forEach((button) =>
    syncVideoControl(button, $("video", button.parentElement)));
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

// Videos load only while visible, have an explicit playback control and
// respect reduced motion until the visitor chooses to play one.
const ambientVideos = $$("video");
const visibleVideos = new Set();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function syncVideoControl(button, video) {
  if (!video) return;
  const paused = video.paused || video.ended;
  const label = paused ? copy("Reproducir video", "Play video") : copy("Pausar video", "Pause video");
  button.classList.toggle("is-paused", paused);
  button.setAttribute("aria-label", label);
  $(".media-toggle__label", button).textContent = label;
}
function attachVideoControl(media, video) {
  if (!media || !video) return;
  $$(".media-toggle", media).forEach((button) => button.remove());
  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-toggle";
  const icon = document.createElement("span");
  icon.className = "media-toggle__icon";
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "media-toggle__label";
  button.append(icon, label);
  media.append(button);
  button.addEventListener("click", () => {
    if (video.paused || video.ended) {
      video.dataset.userPaused = "false";
      video.dataset.userPlay = "true";
      playAmbient(video);
    } else {
      video.dataset.userPaused = "true";
      video.pause();
    }
    syncVideoControl(button, video);
  });
  ["play", "pause", "ended"].forEach((name) =>
    video.addEventListener(name, () => syncVideoControl(button, video)));
  syncVideoControl(button, video);
}
function loadVideo(video) {
  const source = video.querySelector("source[data-src]");
  if (!source) return;
  source.src = source.dataset.src;
  source.removeAttribute("data-src");
  video.load();
}
function playAmbient(video) {
  if (document.hidden || video.dataset.userPaused === "true" ||
      (reducedMotion.matches && video.dataset.userPlay !== "true") ||
      ($("#svc-modal").classList.contains("is-open") && !video.closest("#svc-modal"))) return;
  loadVideo(video);
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.play().catch(() => {});
}
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
      visibleVideos.add(video);
      playAmbient(video);
    } else {
      visibleVideos.delete(video);
      video.pause();
    }
  });
}, { threshold: [0, 0.3] });
ambientVideos.forEach((video) => {
  attachVideoControl(video.parentElement, video);
  videoObserver.observe(video);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) $$("video").forEach((video) => video.pause());
  else visibleVideos.forEach(playAmbient);
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    $$("video").forEach((video) => {
      video.dataset.userPlay = "false";
      video.pause();
    });
  } else visibleVideos.forEach(playAmbient);
});

// Service info modal: the cards stay text-only in the grid. Tapping
// "Más información" opens a popup with the photo or video, the explanation,
// the price and a "Reservar ahora" button that jumps into the booking flow.
const svcModal = $("#svc-modal");
let svcReturnFocus = null;
function openServiceModal(card) {
  if (!svcModal || !card) return;
  svcReturnFocus = document.activeElement;
  const mediaHost = $(".svc-modal__media", svcModal);
  mediaHost.innerHTML = "";
  const media = $(".card__media", card);
  if (media) {
    const clone = media.cloneNode(true);
    $$(".media-toggle", clone).forEach((button) => button.remove());
    const video = $("video", clone);
    if (video) {
      const source = $("source", video);
      if (source && source.dataset.src) {
        source.src = source.dataset.src;
        source.removeAttribute("data-src");
      }
      video.preload = "none";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      attachVideoControl(clone, video);
    }
    mediaHost.append(clone);
  }
  mediaHost.hidden = !media;
  const title = $("h3", card);
  $("#svc-modal-title").innerHTML = title ? title.innerHTML : "";
  const price = $(".card__price", card);
  const priceHost = $(".svc-modal__price", svcModal);
  priceHost.innerHTML = price ? price.innerHTML : "";
  priceHost.hidden = !price;
  const descHost = $(".svc-modal__desc", svcModal);
  descHost.innerHTML = "";
  $$(".card__body > p:not(.card__price):not(.card__eyebrow), .card__body > .card__list", card).forEach((node) =>
    descHost.append(node.cloneNode(true)),
  );
  const proof = $(".card__proof", card);
  if (proof) {
    const link = proof.cloneNode(true);
    link.className = "svc-modal__proof";
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", copy("Ampliar resultados del tratamiento", "View treatment results"));
    descHost.append(link);
  }
  const meta = $(".card__meta", card);
  const metaHost = $(".svc-modal__meta", svcModal);
  metaHost.innerHTML = meta ? meta.innerHTML : "";
  metaHost.hidden = !meta;
  const bookBtn = $("[data-book]", card);
  $(".svc-modal__cta", svcModal).href = bookBtn
    ? bookBtn.dataset.book
    : "/reservar";
  svcModal.classList.add("is-open");
  svcModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  visibleVideos.forEach((video) => video.pause());
  ["main", ".nav", ".footer", ".skip-link"].forEach((selector) => {
    const element = $(selector);
    if (element) element.inert = true;
  });
  $(".svc-modal__dialog", svcModal).scrollTop = 0;
  $(".svc-modal__close", svcModal).focus({ preventScroll: true });
  motion?.modal($(".svc-modal__dialog", svcModal));
  const activeVideo = $("video", mediaHost);
  if (activeVideo) playAmbient(activeVideo);
}
function closeServiceModal(restoreFocus = false) {
  if (!svcModal) return;
  const video = $("video", svcModal);
  if (video) video.pause();
  svcModal.classList.remove("is-open");
  svcModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  ["main", ".nav", ".footer", ".skip-link"].forEach((selector) => {
    const element = $(selector);
    if (element) element.inert = false;
  });
  if (restoreFocus && svcReturnFocus) svcReturnFocus.focus();
  visibleVideos.forEach(playAmbient);
}
$$("[data-book]").forEach((button) =>
  button.addEventListener("click", () => {
    const card = button.closest(".card");
    if (card) openServiceModal(card);
  }),
);
$$("[data-modal-close]").forEach((element) =>
  element.addEventListener("click", () => closeServiceModal(true)),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && svcModal?.classList.contains("is-open")) {
    const items = $$('button:not([disabled]), a[href], [tabindex="0"]', svcModal)
      .filter((element) => element.getClientRects().length);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  if (
    event.key === "Escape" &&
    svcModal &&
    svcModal.classList.contains("is-open")
  ) {
    event.preventDefault();
    closeServiceModal(true);
  }
});
// Native horizontal scrolling supports touch, trackpads and keyboard navigation.
const resultsGallery = $(".results-gallery");
const resultsTrack = $(".results-gallery__track", resultsGallery);
const resultSlides = $$(".results-gallery__slide", resultsGallery);
const resultDots = $$("[data-results-index]", resultsGallery);
const resultPrev = $("[data-results-prev]", resultsGallery);
const resultNext = $("[data-results-next]", resultsGallery);
const resultCount = $(".results-gallery__count", resultsGallery);
let resultIndex = 0;

function updateResultsGallery() {
  resultsGallery.setAttribute("aria-label", copy("Galería de resultados", "Results gallery"));
  resultsGallery.setAttribute("aria-roledescription", copy("carrusel", "carousel"));
  $(".results-gallery__dots", resultsGallery).setAttribute("aria-label", copy("Seleccionar imagen", "Choose an image"));
  resultSlides.forEach((slide, index) => {
    slide.setAttribute("aria-roledescription", copy("diapositiva", "slide"));
    slide.setAttribute("aria-label", copy(`${index + 1} de ${resultSlides.length}`, `${index + 1} of ${resultSlides.length}`));
  });
  resultDots.forEach((dot, index) => {
    dot.setAttribute("aria-label", copy(`Ver imagen ${index + 1} de ${resultSlides.length}`, `View image ${index + 1} of ${resultSlides.length}`));
    if (index === resultIndex) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  resultPrev.disabled = resultIndex === 0;
  resultNext.disabled = resultIndex === resultSlides.length - 1;
  resultCount.textContent = `${resultIndex + 1} / ${resultSlides.length}`;
  resultCount.setAttribute("aria-label", copy(`Imagen ${resultIndex + 1} de ${resultSlides.length}`, `Image ${resultIndex + 1} of ${resultSlides.length}`));
  $$("[data-i18n-alt]", resultsGallery).forEach((image) => {
    image.dataset.altEs ??= image.alt;
    image.alt = lang === "en" ? EN[image.dataset.i18nAlt] || image.dataset.altEs : image.dataset.altEs;
  });
}

function goToResult(index, animate = true) {
  const target = Math.max(0, Math.min(resultSlides.length - 1, index));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  resultsTrack.scrollTo({
    left: resultSlides[target].offsetLeft - resultSlides[0].offsetLeft,
    behavior: animate && !reducedMotion ? "smooth" : "auto",
  });
}

$(".results-gallery__controls", resultsGallery).hidden = false;
resultCount.hidden = false;
resultPrev.addEventListener("click", () => goToResult(resultIndex - 1));
resultNext.addEventListener("click", () => goToResult(resultIndex + 1));
resultDots.forEach((dot) => dot.addEventListener("click", () => goToResult(Number(dot.dataset.resultsIndex))));
resultsTrack.addEventListener("keydown", (event) => {
  if (event.target !== resultsTrack) return;
  const targets = { ArrowLeft: resultIndex - 1, ArrowRight: resultIndex + 1, Home: 0, End: resultSlides.length - 1 };
  if (!(event.key in targets)) return;
  event.preventDefault();
  goToResult(targets[event.key]);
});
let resultScrollFrame = 0;
resultsTrack.addEventListener("scroll", () => {
  if (resultScrollFrame) return;
  resultScrollFrame = requestAnimationFrame(() => {
    resultScrollFrame = 0;
    const start = resultSlides[0].offsetLeft;
    const nearest = resultSlides.reduce((best, slide, index) =>
      Math.abs(slide.offsetLeft - start - resultsTrack.scrollLeft) <
      Math.abs(resultSlides[best].offsetLeft - start - resultsTrack.scrollLeft) ? index : best, 0);
    if (nearest !== resultIndex) {
      resultIndex = nearest;
      updateResultsGallery();
    }
  });
}, { passive: true });
new ResizeObserver(() => goToResult(resultIndex, false)).observe(resultsTrack);

$("#year").textContent = new Date().getFullYear();
let savedLang = "es";
try {
  savedLang = localStorage.getItem("hesed-lang") || "es";
} catch {
  /* Keep Spanish default. */
}
setLang(savedLang);
