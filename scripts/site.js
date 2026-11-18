import { createChipScene, createLavaScene } from './neuropoly.js';

const page = document.querySelector('main');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const trackMouse = matchMedia(
  '(any-hover:hover) and (any-pointer:fine) and (prefers-reduced-motion:no-preference)',
);
const lavaCanvas = document.querySelector('.lava-field');
const lavaScene = lavaCanvas
  ? createLavaScene(lavaCanvas, reducedMotion)
  : null;
const chipScene = lavaCanvas
  ? createChipScene(lavaCanvas.closest('.neuropoly-card'), reducedMotion)
  : null;
const cursorGlow = document.querySelector('.cursor-glow');
let typingTimer = 0;
let trackedCard = null;
let frameId = 0;
let mouseX = 0;
let mouseY = 0;
let glowX = 0;
let glowY = 0;

function typeGreeting(animate = !reducedMotion.matches) {
  clearTimeout(typingTimer);
  const greeting = page.querySelector('.greeting-text');
  if (!greeting) return;
  const caret = page.querySelector('.greeting-caret');
  caret.classList.remove('is-blinking');
  const word = greeting.parentElement.getAttribute('aria-label');
  greeting.textContent = animate ? '' : word;
  if (!animate) return;
  let letters = 0;
  function typeLetter() {
    greeting.textContent = word.slice(0, ++letters);
    if (letters < word.length) typingTimer = setTimeout(typeLetter, 132);
    else caret.classList.add('is-blinking');
  }
  typingTimer = setTimeout(typeLetter, 235);
}

function setTrackedCard(card) {
  if (trackedCard === card) return;
  if (trackedCard) {
    trackedCard.classList.remove('is-tracking');
    for (const prop of ['--card-x', '--card-y', '--card-angle'])
      trackedCard.style.removeProperty(prop);
    if (trackedCard.classList.contains('neuropoly-card')) {
      lavaScene?.release();
      chipScene?.release();
    }
  }
  trackedCard = card;
  if (card) card.classList.add('is-tracking');
}

function paintPointer() {
  frameId = 0;
  glowX += (mouseX - glowX) * 0.24;
  glowY += (mouseY - glowY) * 0.24;
  cursorGlow.style.transform = `translate3d(${glowX}px,${glowY}px,0) translate(-50%,-50%)`;
  if (Math.hypot(mouseX - glowX, mouseY - glowY) > 0.75) {
    frameId = requestAnimationFrame(paintPointer);
  }
}

function updateCard() {
  const card = document
    .elementFromPoint(mouseX, mouseY)
    ?.closest('.project-card');
  setTrackedCard(card || null);
  if (!card) return;
  const bounds = card.getBoundingClientRect();
  const x = (mouseX - bounds.left) / bounds.width;
  const y = (mouseY - bounds.top) / bounds.height;
  if (card.classList.contains('neuropoly-card')) {
    lavaScene?.target(x, y);
    chipScene?.target(x, y);
    return;
  }
  const angle = (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 90;
  card.style.setProperty('--card-x', `${x * 100}%`);
  card.style.setProperty('--card-y', `${y * 100}%`);
  card.style.setProperty('--card-angle', `${angle}deg`);
}

function resetPointer() {
  cursorGlow.classList.remove('is-visible');
  cancelAnimationFrame(frameId);
  frameId = 0;
  setTrackedCard(null);
}

window.addEventListener(
  'pointermove',
  (event) => {
    if (!trackMouse.matches || event.pointerType !== 'mouse') return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (!cursorGlow.classList.contains('is-visible')) {
      glowX = mouseX;
      glowY = mouseY;
      cursorGlow.classList.add('is-visible');
    }
    updateCard();
    if (!frameId) frameId = requestAnimationFrame(paintPointer);
  },
  { passive: true },
);
window.addEventListener(
  'scroll',
  () => {
    if (cursorGlow.classList.contains('is-visible')) updateCard();
  },
  { passive: true },
);
window.addEventListener(
  'pointerdown',
  (event) => {
    if (event.pointerType !== 'mouse') resetPointer();
  },
  { passive: true },
);
document.documentElement.addEventListener('pointerleave', resetPointer);
window.addEventListener('blur', resetPointer);
window.addEventListener('pagehide', resetPointer);
trackMouse.addEventListener('change', resetPointer);
reducedMotion.addEventListener('change', () => typeGreeting(false));

const starfield = document.querySelector('.starfield');

function drawStarfield() {
  const width = starfield.clientWidth;
  const height = starfield.clientHeight;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  starfield.width = Math.round(width * scale);
  starfield.height = Math.round(height * scale);
  const context = starfield.getContext('2d');
  if (!context) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  let seed = 2411;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let row = 0; row < height; row += 64) {
    for (let col = 0; col < width; col += 69) {
      if (random() < 0.2) continue;
      const x = col + 5 + random() * 59;
      const y = row + 5 + random() * 54;
      const bright = random() > 0.9;
      const radius = bright ? 1.0 : 0.44 + random() * 0.31;
      const opacity = bright ? 0.64 : 0.24 + random() * 0.27;
      context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fill();
    }
  }
}
window.addEventListener('resize', drawStarfield, { passive: true });
drawStarfield();

typeGreeting();
