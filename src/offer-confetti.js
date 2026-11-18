// Measure the printed glyphs at their actual baseline, including display fonts
// with shorter, old-style numerals. Recalculate only when the layout changes.
function createContactPieces(dialog, pieces) {
  const ink = document.createElement('canvas').getContext('2d');
  const surfaces = [
    { selector: '.holiday-offer__book', points: [[.18, 0], [.53, 0], [.82, 0]] },
    { selector: '.holiday-offer__close svg', points: [[.27, .27], [.73, .27]], small: true },
    { selector: '.holiday-offer__amount', glyphs: [[0, .49], [1, .51]] },
    { selector: '.holiday-offer__percent', glyphs: [[0, .25]], small: true },
    { selector: '.holiday-offer__occasion span', glyphs: [[0, .33], [6, .46]], small: true },
  ];
  let index = 0;
  for (const surface of surfaces) {
    surface.element = dialog.querySelector(surface.selector);
    surface.baseline = surface.element.querySelector('.foil-baseline');
    if (surface.glyphs && !ink) continue;
    surface.foils = (surface.glyphs || surface.points).map(() => {
      const foil = document.createElement('b');
      foil.className = 'foil--contact';
      foil.style.width = (surface.small ? 5 : 8 + index % 3) + 'px';
      foil.style.height = (surface.small ? 2.5 : 3.5) + 'px';
      const direction = index % 2 === 0 ? 1 : -1;
      foil.style.setProperty('--swing', direction * (12 + index % 5 * 4) + 'px');
      foil.style.setProperty('--slip', direction * (surface.small ? 4 : 7) + 'px');
      foil.style.setProperty('--tilt', direction * (surface.small ? 14 : 5) + 'deg');
      const period = 6 + (index % 4) * .61;
      foil.style.setProperty('--period', period + 's');
      foil.style.setProperty('--delay', -period * ((.49 + index * .379) % 1) + 's');
      pieces.append(foil);
      index++;
      return foil;
    });
  }

  return (poster, scale, clip) => {
    for (const surface of surfaces) {
      const { element, baseline, foils } = surface;
      if (!foils) continue;
      const bounds = element.getBoundingClientRect();
      let contacts;
      if (baseline) {
        const style = getComputedStyle(element);
        ink.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
        const text = element.firstChild;
        const baselineY = baseline.getBoundingClientRect().top;
        contacts = surface.glyphs.map(([letter, fraction]) => {
          const range = document.createRange();
          range.setStart(text, letter);
          range.setEnd(text, letter + 1);
          const glyph = range.toString();
          const metrics = ink.measureText(style.textTransform === 'uppercase' ? glyph.toUpperCase() : glyph);
          const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
          return [range.getBoundingClientRect().left + (width * fraction - metrics.actualBoundingBoxLeft) * scale,
            baselineY - metrics.actualBoundingBoxAscent * scale];
        });
      } else {
        contacts = surface.points.map(([x, y]) => [bounds.left + x * bounds.width, bounds.top + y * bounds.height]);
      }
      contacts.forEach(([x, y], i) => {
        const foil = foils[i];
        foil.hidden = Boolean(baseline && (y < clip.top || y > clip.bottom));
        foil.style.left = (x - poster.left) / poster.width * 100 + '%';
        foil.style.top = (y - poster.top) / poster.height * 100 + '%';
        foil.style.setProperty('--drop', (poster.bottom - y) / scale + 15 + 'px');
      });
    }
  };
}

// The rising spray follows the mouth of the bag. The slower falling pieces
// already span the poster when the offer opens, including the first frame.
export function startOfferConfetti(dialog) {
  const layer = dialog.querySelector('.holiday-offer__confetti');
  const stage = dialog.querySelector('.holiday-offer__gift');
  const content = dialog.querySelector('.holiday-offer__content');
  const colors = ['#b48339', '#ac7964', '#dfb661', '#c09962', '#ebcdaa'];
  function positionFoils() {
    const poster = layer.getBoundingClientRect();
    const bag = stage.getBoundingClientRect();
    if (!poster.width || !poster.height) return;
    positionContacts(poster, poster.height / layer.offsetHeight, content.getBoundingClientRect());
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
  const positionContacts = createContactPieces(dialog, pieces);
  layer.append(pieces);
  positionFoils();
  document.fonts.ready.then(() => {
    if (dialog.open) positionFoils();
  });
  const observer = new ResizeObserver(positionFoils);
  observer.observe(layer);
  observer.observe(stage);
  content.addEventListener('scroll', positionFoils, { passive: true });
  dialog.addEventListener('close', () => {
    observer.disconnect();
    content.removeEventListener('scroll', positionFoils);
    layer.replaceChildren();
  }, { once: true });
}
