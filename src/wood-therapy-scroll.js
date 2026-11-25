import { anatomyCues } from './wood-anatomy-track.js';

export function initWoodTherapyScroll(chapter) {
  const video = chapter.querySelector("video");
  const stage = chapter.querySelector("figure");
  const cutawaySources = [...chapter.querySelectorAll("source[data-still-media]")].map(source => ({
    source, defaultMedia: source.media,
  }));
  function useCutaway(open) {
    for (const { source, defaultMedia } of cutawaySources) {
      source.media = open ? source.dataset.stillMedia : defaultMedia;
    }
  }
  const desktop = matchMedia("(min-width: 761px) and (orientation: landscape) and (any-pointer: fine)");
  const panoramic = matchMedia("(min-width: 761px) and (min-aspect-ratio: 43/20) and (any-pointer: fine)");
  const portrait = matchMedia("(orientation: portrait)");
  const unsupportedUhd = new Set();
  let panoramaFailed = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // The opening contains only the original footage. The divider opens after it.
  const introEnd = 1.625;
  let introFinished = false;
  let startingIntro = false;
  const finalCue = anatomyCues[anatomyCues.length - 1].start;
  const scrubEnd = 17 - 1 / 24;
  const catalogStart = 16.9;
  const catalogEnd = 19.95;
  const services = document.querySelector("#servicios");
  const navigation = document.querySelector("#nav");
  let finale = null;
  let catalogOrigin = null;
  let released = false;
  let previousY = window.scrollY;
  let nearby = false;
  let frame = 0;
  let lastStep = 0;
  let finishRequested = false;

  const notes = [...chapter.querySelectorAll("[data-anatomy]")];
  const pointer = chapter.querySelector(".wood-pointer");
  const focus = pointer.querySelector(".wood-focus");
  const ring = pointer.querySelector(".wood-focus-ring");
  const leader = pointer.querySelector(".wood-leader");
  let activeCue = -1;

  function annotate(time) {
    const next = anatomyCues.findIndex(cue => cue.start > time);
    const index = next === -1 ? anatomyCues.length - 1 : next - 1;
    if (index !== activeCue) {
      notes[activeCue]?.classList.remove("is-current");
      notes[index]?.classList.add("is-current");
      pointer.classList.toggle("is-visible", index >= 0);
      activeCue = index;
    }
    if (index < 0) return;
    const cue = anatomyCues[index];
    const sample = Math.min((time - cue.start) * 4, cue.points.length - 1);
    const first = Math.floor(sample);
    const a = cue.points[first], b = cue.points[Math.min(first + 1, cue.points.length - 1)];
    const at = axis => a[axis] + (b[axis] - a[axis]) * (sample - first);
    // Map the landmark from the encoded anatomical pane through object-fit: cover.
    const w = stage.clientWidth, h = stage.clientHeight;
    const tall = video.videoHeight > video.videoWidth;
    const wide = video.videoWidth / video.videoHeight > 2;
    const imageW = Math.max(w, h * video.videoWidth / video.videoHeight);
    const imageH = imageW * video.videoHeight / video.videoWidth;
    const x = (w - imageW) / 2 + imageW * (tall ? at(1) : (1 + at(wide ? 3 : 0)) / 2);
    const y = (h - imageH) / 2 + imageH * (tall ? (1 + at(2)) / 2 : at(2));
    const note = notes[index].parentElement;
    const endX = note.offsetLeft + notes[index].offsetLeft + 2;
    const endY = note.offsetTop + notes[index].offsetTop - 8;
    focus.setAttribute("transform", `translate(${x} ${y})`);
    const fluid = notes[index].dataset.anatomy === "fluid";
    const radius = fluid ? 15 - 9 * (sample / (cue.points.length - 1)) : 10;
    ring.setAttribute("r", String(radius));
    leader.setAttribute("d", endY > y + radius + 12
      ? `M ${x} ${y + radius + 2} L ${x} ${y + radius + 10} L ${endX} ${endY}` : "");
  }

  function stopFinale() {
    finishRequested = false;
    lastStep = 0;
    if (!finale) return;
    finale = null;
    released = true;
    video.pause();
    stage.classList.remove("is-leaving");
  }

  // Keep the shot at viewport size while the actual catalog moves over it.
  // Derive the overlap from layout so that scrolling back retraces the same seam.
  function joinCatalog(chapterBounds) {
    const screen = stage.offsetHeight;
    const joining = chapterBounds.top < 0 && chapterBounds.bottom > 0 &&
      chapterBounds.bottom < screen * 1.38 && !chapter.classList.contains("still");
    chapter.classList.toggle("is-joining", joining);
    if (joining) {
      // A short catalog can expose the following section before the shot has finished.
      stage.style.setProperty("--wood-covered", Math.max(0, screen - chapterBounds.bottom) + "px");
      const opacity = Math.max(0, Math.min(1, 1 - chapterBounds.bottom / (screen * .34)));
      navigation?.style.setProperty("--wood-nav-opacity", opacity.toFixed(3));
      navigation?.classList.toggle("wood-nav-visible", opacity > .5);
    } else {
      navigation?.style.removeProperty("--wood-nav-opacity");
      navigation?.classList.remove("wood-nav-visible");
    }
  }

  function startFinale() {
    const run = { startY: window.scrollY, start: performance.now(), manual: false };
    catalogOrigin = run.startY;
    finale = run;
    video.currentTime = finalCue;
    video.play().catch(() => {
      if (finale === run) run.manual = true;
    });
    schedule();
  }

  function advanceFinale() {
    const now = performance.now();
    let clockTime = finalCue + (now - finale.start) / 1000;
    // Some mobile browsers accept play() and then suspend decoding.
    if (!finale.manual && clockTime - video.currentTime > 1.25) {
      clockTime = Math.max(finalCue, video.currentTime);
      finale.start = now - (clockTime - finalCue) * 1000;
      finale.manual = true;
      video.pause();
    }
    if (!video.seeking) annotate(video.currentTime);
    const time = finale.manual ? Math.min(video.duration, clockTime) : video.currentTime;
    // Muted playback can be denied in low-power mode. The same clock drives seeking there.
    if (finale.manual && !video.seeking) {
      const target = Math.min(video.duration - 1 / 24, time);
      if (Math.abs(video.currentTime - target) > 1 / 24) video.currentTime = target;
    }
    stage.classList.toggle("is-leaving", time >= 17.5);
    const fraction = Math.max(0, Math.min(1, (time - catalogStart) / (catalogEnd - catalogStart)));
    if (!fraction && !video.ended) { schedule(); return; }
    const goal = services.getBoundingClientRect().top + scrollY;
    const distance = goal - finale.startY;
    const next = finale.startY + distance * fraction * fraction * (3 - 2 * fraction);
    if (fraction > 0 && next > scrollY) window.scrollTo({ top: next, behavior: "instant" });
    if (video.ended || fraction === 1) {
      stopFinale();
      if (goal > scrollY) window.scrollTo({ top: goal, behavior: "instant" });
      return;
    }
    schedule();
  }

  // A wheel notch can span half a second of footage. Decode the intervening
  // frames without consuming wheel events or changing the native page scroll.
  function scrub(target) {
    const delta = target - video.currentTime;
    if (Math.abs(delta) <= 1 / 48) { lastStep = 0; return; }
    if (!desktop.matches || Math.abs(delta) <= 1 / 24) {
      lastStep = 0;
      video.currentTime = target;
      return;
    }
    const now = performance.now();
    const elapsed = lastStep ? Math.min(now - lastStep, 64) : 1000 / 60;
    lastStep = now;
    const step = Math.max(1 / 24, Math.abs(delta) * (1 - Math.exp(-elapsed / 105)));
    video.currentTime += Math.sign(delta) * Math.min(step, Math.abs(delta));
    // The next step is scheduled by seeked, after this frame is available.
  }

  function update() {
    frame = 0;
    if (!nearby || !Number.isFinite(video.duration)) return;
    const y = window.scrollY;
    const reverse = y < previousY - 1;
    const forward = y > previousY;
    previousY = y;
    const bounds = chapter.getBoundingClientRect();
    joinCatalog(bounds);
    const travel = Math.max(1, bounds.height - stage.offsetHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
    if (reduced.matches) {
      // Scrub the entire film with native scrolling, including its intro and
      // the last stroke as the catalog covers the viewport.
      const covered = Math.min(1, Math.max(0, 1 - bounds.bottom / stage.offsetHeight));
      const time = catalogStart * progress + (catalogEnd - catalogStart) * covered;
      stage.classList.toggle("is-leaving", time >= 17.5);
      if (!video.seeking) {
        annotate(video.currentTime);
        if (Math.abs(video.currentTime - time) > 1 / 48) video.currentTime = time;
      }
      return;
    }
    let target = introEnd + progress * (scrubEnd - introEnd);
    if (finale) {
      if (reverse || document.hidden || bounds.bottom < 0 ||
          document.querySelector("dialog[open], .svc-modal.is-open, .menu-open")) stopFinale();
      else { advanceFinale(); return; }
    }
    if (target < finalCue - .1) { released = false; catalogOrigin = null; }
    if (released && bounds.bottom <= 1) return;
    if (!released && !reverse && (forward || finishRequested) && target >= finalCue && bounds.bottom > 1 &&
        !document.hidden && !document.querySelector("dialog[open], .svc-modal.is-open, .menu-open")) {
      if (!desktop.matches || video.currentTime >= finalCue - 1 / 24) {
        finishRequested = false;
        startFinale();
        return;
      }
      finishRequested = true;
      target = finalCue;
    } else finishRequested = false;
    // Retrace the same eased reveal on the way back from the catalog.
    if (chapter.classList.contains("is-joining") && (released || reverse) && target >= finalCue) {
      const goal = y + bounds.bottom;
      const origin = catalogOrigin ?? y + bounds.top + travel * (finalCue - introEnd) / (scrubEnd - introEnd);
      if (y > origin && goal > origin) {
        const fraction = Math.min(1, (y - origin) / (goal - origin));
        const timeFraction = .5 - Math.sin(Math.asin(1 - 2 * fraction) / 3);
        target = catalogStart + timeFraction * (catalogEnd - catalogStart);
        released = true;
      }
    }
    stage.classList.toggle("is-leaving", target >= 17.5);
    if (video.seeking) return;
    annotate(video.currentTime);
    if (!introFinished && bounds.top >= -1) {
      const visibleHeight = Math.max(0, innerHeight - Math.max(0, bounds.top));
      if (document.hidden || visibleHeight < stage.offsetHeight * .6 ||
          document.querySelector("dialog[open], .svc-modal.is-open")) {
        video.pause();
        return;
      }
      if (video.currentTime < introEnd && video.readyState >= 2) {
        if (video.paused && !startingIntro) {
          startingIntro = true;
          video.play().catch(() => { introFinished = true; })
            .finally(() => { startingIntro = false; });
        }
        if (!video.paused) schedule();
        return;
      }
      if (video.readyState < 2) return;
    }
    introFinished = true;
    video.pause();
    scrub(target);
  }

  function schedule() {
    if (nearby && !frame) frame = requestAnimationFrame(update);
  }

  function selectVideo() {
    if (!nearby) return;
    const axis = portrait.matches ? "v" : panoramic.matches && !panoramaFailed ? "pano" : "h";
    // Cover can enlarge the image beyond the viewport width on tall phones.
    const baseWidth = portrait.matches ? 1080 : 1920;
    const baseHeight = axis === "v" ? 1920 : axis === "pano" ? 720 : 1080;
    const scale = Math.max(innerWidth / baseWidth, innerHeight / baseHeight) * devicePixelRatio;
    const connection = navigator.connection;
    const constrained = connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType);
    const uhd = scale >= 1.3 && !constrained && !unsupportedUhd.has(axis);
    const src = "/videos/madera-luz-" + axis + (uhd ? "-uhd" : "") + ".mp4";
    if (video.getAttribute("src") !== src) {
      stage.classList.remove("has-frame");
      stopFinale();
      if (desktop.matches || reduced.matches) video.preload = "auto";
      video.src = src;
      video.load();
    }
    schedule();
  }

  video.addEventListener("loadeddata", () => {
    if (chapter.classList.contains("still")) {
      useCutaway(false);
      chapter.classList.remove("still");
    }
    stage.classList.add("has-frame");
    schedule();
  });
  // A visitor can take control again at any point during the automatic exit.
  chapter.addEventListener("wheel", event => {
    if (event.deltaY < 0) stopFinale();
  }, { passive: true });
  chapter.addEventListener("touchstart", stopFinale, { passive: true });
  addEventListener("keydown", event => {
    if (["ArrowUp", "PageUp", "Home"].includes(event.key)) stopFinale();
  });
  addEventListener("pagehide", stopFinale);
  video.addEventListener("seeked", schedule);
  video.addEventListener("playing", schedule);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopFinale();
    else schedule();
  });
  document.addEventListener("close", schedule, true);
  video.addEventListener("error", () => {
    stage.classList.remove("has-frame");
    const source = video.getAttribute("src");
    const uhd = source?.match(/-(h|v|pano)-uhd\.mp4$/);
    if (uhd) {
      unsupportedUhd.add(uhd[1]);
      video.src = source.replace("-uhd.mp4", ".mp4");
    } else if (source?.endsWith("-pano.mp4")) {
      panoramaFailed = true;
      selectVideo();
    } else if (source) {
      useCutaway(true);
      stopFinale();
      chapter.classList.remove("is-joining");
      navigation?.style.removeProperty("--wood-nav-opacity");
      navigation?.classList.remove("wood-nav-visible");
      chapter.classList.add("still");
    }
  });
  portrait.addEventListener("change", selectVideo);
  panoramic.addEventListener("change", selectVideo);
  desktop.addEventListener("change", selectVideo);
  reduced.addEventListener("change", () => {
    stopFinale();
    video.pause();
    released = false;
    catalogOrigin = null;
    schedule();
  });
  const observer = new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (nearby) selectVideo();
    else {
      stopFinale();
      chapter.classList.remove("is-joining");
      navigation?.style.removeProperty("--wood-nav-opacity");
      navigation?.classList.remove("wood-nav-visible");
      video.pause();
    }
  }, { rootMargin: "250px 0px" });
  observer.observe(chapter);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("pageshow", schedule);
}
