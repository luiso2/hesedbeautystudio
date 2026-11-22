// Measure the stationary sleeve so rotating the card never changes its own timeline.
export function attachGiftCardMotion(stage) {
  if (!stage?.animate) return;
  const card = stage.querySelector(".gift-card-preview");
  const foil = stage.querySelector(".gift-card-preview__foil");
  const timeline = typeof ViewTimeline === "function"
    ? new ViewTimeline({ subject: stage, axis: "block" })
    : null;
  const timing = timeline
    ? { timeline, duration: "auto", fill: "both" }
    : { duration: 1000, fill: "both" };

  const turn = card.animate([
    { transform: "rotateY(-28deg) rotateX(7deg) rotateZ(-2deg)" },
    { offset: .52, transform: "rotateY(0deg) rotateX(0deg) rotateZ(0deg)" },
    { transform: "rotateY(16deg) rotateX(-5deg) rotateZ(1deg)" },
  ], timing);
  const reflection = foil.animate([
    { transform: "translateX(-95%)" }, { transform: "translateX(95%)" },
  ], timing);

  let frame = 0;
  function sample() {
    frame = 0;
    const { top, height } = stage.getBoundingClientRect();
    const progress = (window.innerHeight - top) / (window.innerHeight + height);
    turn.currentTime = reflection.currentTime = Math.max(0, Math.min(1, progress)) * 1000;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(sample);
  }
  let observer;
  if (!timeline) {
    turn.pause();
    reflection.pause();
    sample();
    function listen() {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      schedule();
    }
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) listen();
        else unlisten();
      }, { rootMargin: "128px" });
      observer.observe(stage);
    } else listen();
  }
  function unlisten() {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
    frame = 0;
  }
  return () => {
    observer?.disconnect();
    unlisten();
    turn.cancel();
    reflection.cancel();
  };
}
