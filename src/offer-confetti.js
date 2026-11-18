// The rising spray follows the mouth of the bag. The slower falling pieces
// already span the poster when the offer opens, including the first frame.
export function startOfferConfetti(dialog) {
  const layer = dialog.querySelector('.holiday-offer__confetti');
  const stage = dialog.querySelector('.holiday-offer__gift');
  const content = dialog.querySelector('.holiday-offer__content');
  const colors = ['#b48339', '#ac7964', '#dfb661', '#c09962', '#ebcdaa'];
  function positionBurst() {
    const poster = layer.getBoundingClientRect();
    const bag = stage.getBoundingClientRect();
    if (!poster.width || !poster.height) return;
    // Ratios keep the origin accurate during the dialog's entrance transform.
    layer.style.setProperty('--launch-x', ((bag.left + bag.width * .5 - poster.left) / poster.width * 100) + 'cqw');
    layer.style.setProperty('--launch-y', ((bag.top + bag.height * .28 - poster.top) / poster.height * 100) + 'cqh');
  }

  const pieces = document.createDocumentFragment();
  for (const [type, count] of [['rain', 72], ['burst', 34]]) {
    for (let i = 0; i < count; i++) {
      const foil = document.createElement('i');
      foil.className = 'foil--' + type;
      const style = foil.style;
      const fraction = (i + .5) / count;
      // Weight the sides so the foil frames the headline even at peak density.
      const lane = 2 + 96 * (fraction - .075 * Math.sin(2 * Math.PI * fraction));
      const drift = Math.min(3 + i % 7, lane - 1, 98 - lane);
      style.setProperty('--lane', lane.toFixed(2) + 'cqw');
      style.setProperty('--drift', ((i % 2 ? -1 : 1) * drift).toFixed(2) + 'cqw');
      style.setProperty('--spin', ((i % 2 ? -1 : 1) * (78 + (i * 37) % 115)) + 'deg');
      style.setProperty('--foil-color', colors[i % colors.length]);
      style.setProperty('--foil-width', (3 + i % 5) + 'px');
      style.setProperty('--foil-height', (5 + i % 7) + 'px');
      if (type === 'rain') {
        const period = 4.9 + (i % 9) * .36;
        style.setProperty('--period', period + 's');
        style.setProperty('--delay', (-period * ((i * .618 + .17) % 1)).toFixed(3) + 's');
      } else {
        style.setProperty('--crest', (3 + (i * 11) % 29) + 'cqh');
        style.setProperty('--delay', ((i * 5) % 17 * .023) + 's');
      }
      pieces.append(foil);
    }
  }
  positionBurst();
  layer.append(pieces);
  const observer = new ResizeObserver(positionBurst);
  observer.observe(layer);
  observer.observe(stage);
  content.addEventListener('scroll', positionBurst, { passive: true });
  dialog.addEventListener('close', () => {
    observer.disconnect();
    content.removeEventListener('scroll', positionBurst);
    layer.replaceChildren();
  }, { once: true });
}
