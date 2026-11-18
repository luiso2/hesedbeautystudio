// The rising spray follows the mouth of the bag. The slower falling pieces
// already span the poster when the offer opens, including the first frame.
export function startOfferConfetti(dialog) {
  const layer = dialog.querySelector('.holiday-offer__confetti');
  const stage = dialog.querySelector('.holiday-offer__gift');
  const content = dialog.querySelector('.holiday-offer__content');
  const colors = ['#c39a58', '#9c713e', '#e0bd78', '#b48659'];
  function positionBurst() {
    const poster = layer.getBoundingClientRect();
    const bag = stage.getBoundingClientRect();
    if (!poster.width || !poster.height) return;
    // Ratios keep the origin accurate during the dialog's entrance transform.
    layer.style.setProperty('--launch-x', ((bag.left + bag.width * .5 - poster.left) / poster.width * 100) + 'cqw');
    layer.style.setProperty('--launch-y', ((bag.top + bag.height * .28 - poster.top) / poster.height * 100) + 'cqh');
  }

  const pieces = document.createDocumentFragment();
  for (const [type, count] of [['rain', 25], ['burst', 17]]) {
    for (let i = 0; i < count; i++) {
      const foil = document.createElement('i');
      foil.className = 'foil--' + type;
      const style = foil.style;
      const period = 4.9 + (i % 5) * .39;
      style.setProperty('--lane', ((i + .5) / count * 100).toFixed(2) + 'cqw');
      style.setProperty('--drift', ((i % 2 ? -1 : 1) * (3 + i % 5)) + 'cqw');
      style.setProperty('--spin', ((i % 2 ? -1 : 1) * (78 + (i * 37) % 115)) + 'deg');
      style.setProperty('--foil-color', colors[i % colors.length]);
      style.setProperty('--foil-width', (3 + i % 4) + 'px');
      style.setProperty('--foil-height', (5 + i % 5) + 'px');
      if (type === 'rain') {
        style.setProperty('--period', period + 's');
        style.setProperty('--delay', (-period * ((i * .618 + .17) % 1)).toFixed(3) + 's');
      } else {
        style.setProperty('--crest', (3 + (i * 7) % 24) + 'cqh');
        style.setProperty('--delay', ((i * 5) % 13 * .018) + 's');
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
