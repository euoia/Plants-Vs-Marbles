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
const game = createGame({ preferenceStore });
const view: RenderContext = { game, canvas, ctx };
const unbindInput = bindInput(canvas, game);
let previousFrame = performance.now();
let frameRequest = 0;

function frame(now: number) {
  const deltaSeconds = Math.min(0.05, (now - previousFrame) / 1000);
  previousFrame = now;
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
