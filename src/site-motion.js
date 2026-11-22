import { attachGiftCardMotion } from "./gift-card-motion.js";

// Short, progressive enhancements: content is visible even without animation.
export function initSiteMotion() {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const running = new Set();
  const seen = new WeakSet();
  let observer;
  let stopCard;
  let activeSection;
  let disposed = false;
  const nav = document.querySelector("#nav");
  const sections = [...document.querySelectorAll("#servicios, #maria, #resultados, #gift-cards, #faq")];
  const links = [...document.querySelectorAll(".nav__links a, .menu__links a")];
  let frame = 0;
  function updateNavigation() {
    frame = 0;
    if (!nav) return;
    const offset = nav.getBoundingClientRect().height + 100;
    let current = null;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= offset) current = section.id;
    });
    nav.classList.toggle("is-scrolled", window.scrollY > 20);
    if (activeSection === current) return;
    activeSection = current;
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${current}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  const queueNavigation = () => {
    if (!frame) frame = requestAnimationFrame(updateNavigation);
  };
  window.addEventListener("scroll", queueNavigation, { passive: true });
  window.addEventListener("resize", queueNavigation);
  updateNavigation();

  function animate(element, frames, options = {}) {
    if (!element || preference.matches || !element.animate || disposed) return null;
    const animation = element.animate(frames, {
      duration: 700, easing: "cubic-bezier(.22,1,.36,1)", ...options,
    });
    running.add(animation);
    const finish = () => { running.delete(animation); animation.cancel(); };
    animation.finished.then(finish, finish);
    return animation;
  }

  function reveal(element, delay = 0) {
    return animate(element, [
      { opacity: .78 }, { opacity: 1 },
    ], { delay, fill: "backwards" });
  }

  function observe() {
    if (preference.matches || disposed) return;
    stopCard = attachGiftCardMotion(document.querySelector(".gift-card-stage"));
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        observer.unobserve(entry.target);
        if (entry.boundingClientRect.top >= window.innerHeight) reveal(entry.target);
      });
    }, { rootMargin: "0px 0px 80px 0px" });
    document.querySelectorAll(
      ".section-head, .category-choice, .about__media, .about__text, .step, .faq__head",
    ).forEach((element) => observer.observe(element));
  }

  if (!preference.matches) {
    document.querySelectorAll(
      ".hero__eyebrow, .hero__title, .hero__lead, .hero__actions, .hero__care",
    ).forEach((element, index) => reveal(element, index * 55));
    animate(document.querySelector(".hero__photo-img"), [
      { opacity: .8 }, { opacity: 1 },
    ], { duration: 1000 });
    document.querySelectorAll(".hero__line-art path").forEach((path, index) =>
      animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: 1500, delay: index * 100, easing: "ease-out" }));
    observe();
  }
  preference.addEventListener("change", () => {
    stopCard?.();
    observer?.disconnect();
    running.forEach((animation) => animation.cancel());
    running.clear();
    if (!preference.matches) observe();
  });
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    stopCard?.();
    observer?.disconnect();
    running.forEach((animation) => animation.cancel());
    running.clear();
    disposed = true;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) { disposed = false; observe(); queueNavigation(); }
  });
  return {
    reveal,
    modal(element) {
      animate(element, [{ opacity: .4, translate: "0 14px" }, { opacity: 1, translate: "0 0" }],
        { duration: 350 });
    },
  };
}
