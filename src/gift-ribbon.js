import artwork from './gift-ribbon.svg?raw';

// Each row in the drawing describes tied, tensioned, pulled left, pulled right,
// released and relaxed fabric. Play those poses back to thread the same ribbon.
const forwardTimes = [0, .07, .21, .33, .44, .5];
const keyTimes = [...forwardTimes, ...forwardTimes.slice(0, -1).reverse().map(t => 1 - t)].join(';');
const tracks = ['d', 'x', 'width', 'scale', 'rotate', 'opacity'];

export function mountGiftRibbon(container) {
  container.insertAdjacentHTML('beforeend', artwork);
  const svg = container.querySelector('svg');
  svg.pauseAnimations();
  for (const attribute of tracks) {
    for (const part of svg.querySelectorAll(`[data-${attribute}]`)) {
      const poses = part.dataset[attribute].split(';').map(pose => pose.trim());
      const transform = attribute === 'scale' || attribute === 'rotate';
      const animation = document.createElementNS(svg.namespaceURI, transform ? 'animateTransform' : 'animate');
      animation.setAttribute('attributeName', transform ? 'transform' : attribute);
      if (transform) {
        animation.setAttribute('type', attribute);
        if (attribute === 'rotate') animation.setAttribute('additive', 'sum');
      } else {
        part.setAttribute(attribute, poses[0]);
      }
      animation.setAttribute('values', [...poses, ...poses.slice(0, -1).reverse()].join(';'));
      animation.setAttribute('keyTimes', keyTimes);
      animation.setAttribute('calcMode', 'spline');
      animation.setAttribute('keySplines', Array(10).fill('.34 0 .42 1').join(';'));
      animation.setAttribute('dur', '5.6s');
      animation.setAttribute('repeatCount', 'indefinite');
      part.append(animation);
    }
  }
  svg.setCurrentTime(0);
  return svg;
}
