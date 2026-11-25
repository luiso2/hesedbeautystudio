import { anatomyCues } from './wood-anatomy-track.js';

export function initWoodTherapyScroll(chapter) {
  const video = chapter.querySelector("video");
  const stage = chapter.querySelector("figure");
  const portrait = matchMedia("(orientation: portrait)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // The opening contains only the original footage. The divider opens after it.
  const introEnd = 1.625;
  let introFinished = false;
  let startingIntro = false;
  let nearby = false;
  let frame = 0;

  const notes = [...chapter.querySelectorAll("[data-anatomy]")];
  const pointer = chapter.querySelector(".wood-pointer");
  const focus = pointer.querySelector(".wood-focus");
  const ring = pointer.querySelector(".wood-focus-ring");
  const leader = pointer.querySelector(".wood-leader");
  let activeCue = -1;

  function annotate(time) {
    const index = anatomyCues.findLastIndex(cue => time >= cue.start);
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
    const imageW = Math.max(w, h * video.videoWidth / video.videoHeight);
    const imageH = imageW * video.videoHeight / video.videoWidth;
    const x = (w - imageW) / 2 + imageW * (tall ? at(1) : (1 + at(0)) / 2);
    const y = (h - imageH) / 2 + imageH * (tall ? (1 + at(2)) / 2 : at(2));
    const note = notes[index].parentElement;
    const endX = note.offsetLeft + 14, endY = note.offsetTop + notes[index].offsetTop - 6;
    focus.setAttribute("transform", `translate(${x} ${y})`);
    const fluid = notes[index].dataset.anatomy === "fluid";
    const radius = fluid ? 15 - 9 * (sample / (cue.points.length - 1)) : 10;
    ring.setAttribute("r", String(radius));
    leader.setAttribute("d", endY > y + radius + 12
      ? `M ${x} ${y + radius + 2} L ${x} ${y + radius + 10} L ${endX} ${endY}` : "");
  }

  function update() {
    frame = 0;
    if (!nearby || reduced.matches || !Number.isFinite(video.duration) || video.seeking) return;
    annotate(video.currentTime);
    const bounds = chapter.getBoundingClientRect();
    const travel = Math.max(1, bounds.height - stage.offsetHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
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
    const target = introEnd + progress * (video.duration - 1 / 24 - introEnd);
    if (Math.abs(video.currentTime - target) > 1 / 48) video.currentTime = target;
  }

  function schedule() {
    if (nearby && !frame) frame = requestAnimationFrame(update);
  }

  function selectVideo() {
    if (!nearby || reduced.matches) return;
    const axis = portrait.matches ? "v" : "h";
    const uhd = !navigator.connection?.saveData &&
      innerWidth * devicePixelRatio >= (portrait.matches ? 1440 : 2300);
    const src = "/videos/madera-duo-" + axis + (uhd ? "-uhd" : "") + ".mp4";
    if (video.getAttribute("src") !== src) {
      stage.classList.remove("has-frame");
      video.src = src;
      video.load();
    }
    schedule();
  }

  video.addEventListener("loadeddata", () => {
    chapter.classList.remove("still");
    stage.classList.add("has-frame");
    schedule();
  });
  video.addEventListener("seeked", schedule);
  video.addEventListener("playing", schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("close", schedule, true);
  video.addEventListener("error", () => {
    stage.classList.remove("has-frame");
    const source = video.getAttribute("src");
    if (source?.endsWith("-uhd.mp4")) video.src = source.replace("-uhd.mp4", ".mp4");
    else if (source) chapter.classList.add("still");
  });
  portrait.addEventListener("change", selectVideo);
  reduced.addEventListener("change", () => {
    if (reduced.matches && video.hasAttribute("src")) {
      stage.classList.remove("has-frame");
      video.removeAttribute("src");
      video.load();
    } else selectVideo();
  });
  const observer = new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (nearby) selectVideo();
    else video.pause();
  }, { rootMargin: "250px 0px" });
  observer.observe(chapter);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("pageshow", schedule);
}
