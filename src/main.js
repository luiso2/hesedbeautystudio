import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { EN } from "./i18n.js";

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const isMobile = () => window.innerWidth <= 900;

/* ───────────────────────── i18n ───────────────────────── */
const ES = {};
$$("[data-i18n]").forEach((el) => {
  const k = el.dataset.i18n;
  if (!(k in ES)) ES[k] = el.innerHTML;
});
let lang = "es";
function setLang(next) {
  lang = next;
  const dict = next === "en" ? EN : ES;
  $$("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (dict[k] != null) el.innerHTML = dict[k];
  });
  $$(".lang__btn").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === next));
  document.documentElement.lang = next;
  try { localStorage.setItem("hesed-lang", next); } catch {}
  splitHero();
  ScrollTrigger.refresh();
}
$$(".lang__btn").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ───────────────────────── Lenis ───────────────────────── */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
  else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1 && $(id)) { e.preventDefault(); closeMenu(); scrollTo(id); }
  });
});

/* ───────────────────────── Hero split ───────────────────────── */
function splitHero() {
  $$(".hero__line .split").forEach((el) => {
    const text = el.textContent;
    el.innerHTML = "";
    text.split(" ").forEach((word, wi, arr) => {
      const w = document.createElement("span");
      w.style.display = "inline-block";
      w.style.whiteSpace = "nowrap";
      [...word].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });
  // If the intro already revealed the title, animate the freshly split chars in.
  if (window.__introStarted) {
    gsap.fromTo(".hero__line .char", { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.02, ease: "power4.out", overwrite: true });
  } else {
    gsap.set(".hero__line .char", { yPercent: 110 });
  }
}
splitHero();

/* ───────────────────────── Preloader ───────────────────────── */
const pre = $("#preloader");
const nav = $("#nav");
document.body.classList.add("is-loading");
lenis?.stop();

const intro = gsap.timeline({
  defaults: { ease: "power3.out" },
  onComplete: () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    pre.style.display = "none";
    lenis?.start();
    ScrollTrigger.refresh();
    $(".wa-float")?.classList.add("is-in");
  },
});
intro
  .to(".preloader__ring", { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 0)
  .to(".preloader__h", { strokeDashoffset: 0, duration: 1, ease: "power2.inOut" }, 0.4)
  .to(".preloader__word span", { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.5)
  .to(".preloader__sub", { opacity: 1, duration: 0.8 }, 1.1)
  .to(".preloader__bar i", { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0.6)
  .to(".preloader__inner", { opacity: 0, y: -20, duration: 0.6, ease: "power2.in" }, 2.1)
  .to(".preloader__curtain--b", { scaleY: 1, duration: 0.7, ease: "power4.inOut" }, 2.25)
  .set(".preloader__curtain--a", { opacity: 0 })
  .to(".preloader__curtain--b", { scaleY: 0, transformOrigin: "bottom", duration: 0.9, ease: "power4.inOut" }, 2.95)
  .add(() => { nav.classList.add("is-ready"); window.__introStarted = true; }, 3.0)
  .to(".hero__line .char", { yPercent: 0, duration: 1.2, stagger: 0.022, ease: "power4.out" }, 3.05)
  .to(".hero__video", { scale: 1, duration: 3.5, ease: "power2.out" }, 2.9)
  .to(".hero__eyebrow", { opacity: 1, y: 0, duration: 1, onStart: () => $(".hero__eyebrow").classList.add("is-in") }, 3.3)
  .to(".hero__lead", { opacity: 1, y: 0, duration: 1 }, 3.6)
  .to(".hero__actions", { opacity: 1, y: 0, duration: 1 }, 3.75)
  .to(".hero__creds", { opacity: 1, y: 0, duration: 1, onStart: () => $(".hero__creds").classList.add("is-in") }, 3.9)
  .to(".hero__scroll", { opacity: 1, duration: 1 }, 4.1)
  .to(".hero__signature", { opacity: 1, rotate: -6, duration: 1.2 }, 4.0);

if (reduceMotion) intro.progress(1);

/* ───────────────────────── Nav behaviour ───────────────────────── */
let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle("is-scrolled", y > 40);
    if (y > 500 && y > lastY + 6) nav.classList.add("is-hidden");
    else if (y < lastY - 6) nav.classList.remove("is-hidden");
    lastY = y;
  },
});

/* ───────────────────────── Mobile menu ───────────────────────── */
const burger = $("#burger");
const menu = $("#menu");
let menuOpen = false;
const menuTl = gsap.timeline({ paused: true })
  .to(".menu__bg", { scaleY: 1, duration: 0.7, ease: "power4.inOut" })
  .to(".menu__links a", { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: "power3.out" }, "-=0.2")
  .to(".menu__foot", { opacity: 1, duration: 0.6 }, "-=0.4");
function openMenu() {
  menuOpen = true;
  menu.classList.add("is-open");
  burger.classList.add("is-open");
  burger.setAttribute("aria-expanded", "true");
  menu.setAttribute("aria-hidden", "false");
  lenis?.stop();
  menuTl.play();
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  menuTl.reverse().eventCallback("onReverseComplete", () => {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    lenis?.start();
  });
}
burger.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));

/* ───────────────────────── Magnetic buttons ───────────────────────── */
if (!isTouch) {
  $$(".magnetic").forEach((el) => {
    const strength = 0.18;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.6, ease: "power3.out" });
    });
    el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" }));
  });
}

/* ───────────────────────── Hero parallax on scroll ───────────────────────── */
gsap.to(".hero__content", { yPercent: 18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
gsap.to(".hero__media", { yPercent: 14, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });

/* ───────────────────────── Reveals ───────────────────────── */
$$("[data-reveal]").forEach((el) => {
  if (el.closest(".hero")) return;
  ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => el.classList.add("is-in") });
});
$$("[data-reveal-lines]").forEach((el) => {
  const parts = $$(":scope > span, :scope > em", el);
  gsap.to(parts, {
    opacity: 1, y: 0, rotate: 0, duration: 1.3, stagger: 0.12, ease: "power4.out",
    scrollTrigger: { trigger: el, start: "top 85%", once: true },
  });
});

/* ───────────────────────── Parallax blocks ───────────────────────── */
$$("[data-parallax]").forEach((el) => {
  const f = parseFloat(el.dataset.parallax) || 0.1;
  gsap.fromTo(el, { yPercent: -f * 40 }, { yPercent: f * 40, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
});

/* ───────────────────────── Counters ───────────────────────── */
$$(".stat__num").forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: "top 90%", once: true,
    onEnter: () => gsap.to(obj, { v: target, duration: 2.2, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString("en-US")) }),
  });
});

/* ───────────────────────── Tabs ───────────────────────── */
const tabs = $$(".tab");
const ink = $(".tabs__ink");
function moveInk(tab) {
  if (!ink || !tab) return;
  ink.style.left = tab.offsetLeft + "px";
  ink.style.width = tab.offsetWidth + "px";
}
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.tab;
    tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
    moveInk(tab);
    $$(".panel").forEach((p) => {
      const active = p.dataset.panel === key;
      p.classList.toggle("is-active", active);
      if (active) gsap.fromTo($$(".card", p), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: "power3.out", clearProps: "transform" });
    });
    ScrollTrigger.refresh();
  });
});
window.addEventListener("load", () => moveInk($(".tab.is-active")));
window.addEventListener("resize", () => moveInk($(".tab.is-active")));
document.fonts?.ready.then(() => moveInk($(".tab.is-active")));

/* ───────────────────────── Video hover / in-view playback ───────────────────────── */
$$(".card--video, .reel, .result, .step").forEach((box) => {
  const v = $("video", box);
  if (!v) return;
  const play = () => { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); };
  const pause = () => v.pause();
  if (isTouch) {
    ScrollTrigger.create({ trigger: box, start: "top 80%", end: "bottom 20%", onEnter: play, onEnterBack: play, onLeave: pause, onLeaveBack: pause });
  } else {
    box.addEventListener("mouseenter", play);
    box.addEventListener("mouseleave", pause);
    if (box.classList.contains("result")) {
      ScrollTrigger.create({ trigger: box, start: "top 85%", end: "bottom 15%", onEnter: play, onEnterBack: play, onLeave: pause, onLeaveBack: pause });
    }
  }
});
// Autoplay videos: only run when visible (saves battery)
$$("video[autoplay], video[data-autoplay]").forEach((v) => {
  const play = () => { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); };
  ScrollTrigger.create({ trigger: v, start: "top bottom", end: "bottom top", onEnter: play, onEnterBack: play, onLeave: () => v.pause(), onLeaveBack: () => v.pause() });
});

/* ───────────────────────── Ritual horizontal scroll ───────────────────────── */
let ritualST = null;
function buildRitual() {
  ritualST?.kill();
  gsap.set(".ritual__track", { clearProps: "transform" });
  gsap.set(".ritual__progress i", { scaleX: 0 });
  if (isMobile() || reduceMotion) return;
  const track = $(".ritual__track");
  const distance = () => track.scrollWidth - window.innerWidth;
  const tween = gsap.to(track, { x: () => -distance(), ease: "none" });
  ritualST = ScrollTrigger.create({
    trigger: ".ritual",
    start: "top top",
    end: () => "+=" + distance(),
    pin: ".ritual__pin",
    scrub: 1,
    animation: tween,
    invalidateOnRefresh: true,
    anticipatePin: 1,
    onUpdate: (self) => gsap.set(".ritual__progress i", { scaleX: self.progress }),
  });
  $$(".step").forEach((s, i) => {
    gsap.fromTo(s, { opacity: 0.35, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: s, containerAnimation: tween, start: "left 90%", toggleActions: "play none none reverse" } });
  });
}
buildRitual();
let rw = window.innerWidth;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - rw) < 40) return;
  rw = window.innerWidth;
  buildRitual();
  ScrollTrigger.refresh();
});

/* ───────────────────────── FAQ accordion animation ───────────────────────── */
$$(".acc").forEach((d) => {
  const body = $(".acc__body", d);
  const summary = $("summary", d);
  summary.addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) {
      gsap.to(body, { height: 0, duration: 0.45, ease: "power3.inOut", onComplete: () => { d.open = false; body.style.height = ""; ScrollTrigger.refresh(); } });
    } else {
      d.open = true;
      const h = body.scrollHeight;
      gsap.fromTo(body, { height: 0 }, { height: h, duration: 0.55, ease: "power3.out", onComplete: () => { body.style.height = ""; ScrollTrigger.refresh(); } });
    }
  });
});

/* ───────────────────────── Misc ───────────────────────── */
$("#year").textContent = new Date().getFullYear();
// Spanish by default (the studio's audience); remember an explicit choice.
try {
  if (localStorage.getItem("hesed-lang") === "en") setLang("en");
} catch {}
window.addEventListener("load", () => ScrollTrigger.refresh());
