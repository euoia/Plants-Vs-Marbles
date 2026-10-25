import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/constants';
import { createGame } from './game/game';
import { createBrowserPreferenceStore, createMemoryPreferenceStore } from './game/preferences';
import { updateGame } from './game/simulation';
import type { PreferenceStore } from './game/types';
import type { RenderContext } from './rendering/context';
import { renderGame } from './rendering/renderer';
import './styles.css';
import { bindInput } from './ui/input';

const canvas = document.querySelector<HTMLCanvasElement>('#c');
if (!canvas) {
  throw new Error('The game canvas is missing.');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('This browser does not support 2D canvas rendering.');
}
let preferenceStore: PreferenceStore;
try {
  preferenceStore = createBrowserPreferenceStore(localStorage);
  preferenceStore.load();
} catch (error) {
  console.warn('Local storage is unavailable. Preferences will be kept in memory.', error);
  preferenceStore = createMemoryPreferenceStore();
}
const game = createGame({ preferenceStore, debugAvailable: import.meta.env.DEV });
const view: RenderContext = { game, canvas, ctx };
const unbindInput = bindInput(canvas, game);
let previousFrame = performance.now();
let frameRequest = 0;

// Match the backing store to the displayed size times the screen's pixel density, so the game
// is drawn sharp on high-density screens. Checked every frame to catch resizes, rotation, zoom
// and moving the window to a screen with a different density.
function fitCanvasToScreen(target: HTMLCanvasElement) {
  const density = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(target.clientWidth * density));
  const height = Math.round((width * CANVAS_HEIGHT) / CANVAS_WIDTH);
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
}

function frame(now: number) {
  const deltaSeconds = Math.min(0.05, (now - previousFrame) / 1000);
  previousFrame = now;
  fitCanvasToScreen(view.canvas);
  updateGame(game, deltaSeconds);
  renderGame(view);
  frameRequest = requestAnimationFrame(frame);
}

frameRequest = requestAnimationFrame(frame);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameRequest);
    unbindInput();
  });
}
