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

  function update() {
    frame = 0;
    if (!nearby || reduced.matches || !Number.isFinite(video.duration) || video.seeking) return;
    const bounds = chapter.getBoundingClientRect();
    const travel = Math.max(1, bounds.height - stage.offsetHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
    if (!introFinished && progress === 0) {
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
    else chapter.classList.add("still");
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
