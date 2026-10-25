import {
  callAnteater,
  cancelSelection,
  dropHeldItem,
  findNearestItem,
  placeItem,
  showNotification,
  toggleDebug,
  toggleGlove,
  togglePause,
} from '../game/actions';
import { spawnAnt } from '../game/combat';
import { LANE_COUNT, TOOLBAR_HEIGHT } from '../game/constants';
import { ANT_TYPES } from '../game/definitions';
import { resetGame } from '../game/game';
import type { Game, Point } from '../game/types';
import {
  containsPoint,
  debugAntButton,
  laneAt,
  MENU_BUTTON,
  PAUSE_BUTTON,
  TOOL_BUTTONS,
  toolbarSlot,
} from './layout';
import { getMenuButtons } from './menus';

export function canvasPoint(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): Point {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
    y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
  };
}

export function bindInput(canvas: HTMLCanvasElement, game: Game): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  canvas.addEventListener(
    'pointermove',
    (event) => {
      game.state.pointer = canvasPoint(canvas, event as PointerEvent);
    },
    options,
  );
  canvas.addEventListener(
    'contextmenu',
    (event) => {
      event.preventDefault();
      cancelSelection(game);
    },
    options,
  );
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.button === 0) {
        handlePointerDown(game, canvasPoint(canvas, pointerEvent));
      }
    },
    options,
  );
  window.addEventListener('keydown', (event) => handleKeyDown(game, event), options);
  return () => controller.abort();
}

export function handlePointerDown(game: Game, point: Point) {
  if (game.state.screen !== 'play') {
    const button = getMenuButtons(game).find(
      (button) => !button.locked && containsPoint(point, button),
    );
    if (button) {
      button.onClick();
    }
    return;
  }
  const pauseButton = PAUSE_BUTTON;
  if (containsPoint(point, MENU_BUTTON)) {
    resetGame(game);
    return;
  }
  if (
    point.x >= pauseButton.x &&
    point.x <= pauseButton.x + pauseButton.width &&
    point.y >= pauseButton.y &&
    point.y <= pauseButton.y + pauseButton.height
  ) {
    togglePause(game);
    return;
  }
  if (game.state.paused) {
    return;
  }
  if (game.debug) {
    for (let index = 0; index < ANT_TYPES.length; index++) {
      const button = debugAntButton(index);
      if (
        point.x >= button.x &&
        point.x <= button.x + button.width &&
        point.y >= button.y &&
        point.y <= button.y + button.height
      ) {
        const time = ANT_TYPES[index];
        spawnAnt(game, time, Math.floor(game.random() * LANE_COUNT));
        return;
      }
    }
  }
  for (const definition of game.state.crumbDrops) {
    if (Math.hypot(definition.x - point.x, definition.y - point.y) < 24) {
      game.state.crumbs += definition.value;
      definition.lifeRemaining = 0;
      return;
    }
  }
  if (point.y < TOOLBAR_HEIGHT) {
    for (const key of game.state.availableItems) {
      const index = game.state.availableItems.indexOf(key);
      const shape = toolbarSlot(index);
      if (
        point.x >= shape.x &&
        point.x <= shape.x + shape.width &&
        point.y >= shape.y &&
        point.y <= shape.y + shape.height
      ) {
        const wasActive = game.state.selectedItem === key;
        cancelSelection(game);
        game.state.selectedItem = wasActive ? null : key;
      }
    }
    if (point.x >= TOOL_BUTTONS.glove.x) {
      toggleGlove(game);
    } else if (point.x >= TOOL_BUTTONS.eater.x) {
      callAnteater(game);
    }
    return;
  }
  const lane = laneAt(point);
  if (lane < 0) {
    return;
  }
  if (game.state.gloveActive) {
    if (game.state.heldItem) {
      dropHeldItem(game, lane, point.y);
    } else {
      const item = findNearestItem(game, lane, point.y);
      if (item) {
        game.state.heldItem = item;
        if (item.isPiece) {
          game.state.trackPieces.splice(game.state.trackPieces.indexOf(item.entity), 1);
        } else {
          game.state.marbles.splice(game.state.marbles.indexOf(item.entity), 1);
        }
      }
    }
  } else if (game.state.selectedItem) {
    if (placeItem(game, game.state.selectedItem, lane, point.y)) {
      game.state.selectedItem = null;
    }
  } else {
    // no tool active: click a spring to cycle its strength
    const trackPiece = game.state.trackPieces.find(
      (candidate) =>
        candidate.type === 'spring' &&
        candidate.lane === lane &&
        Math.abs(candidate.y - point.y) < 24,
    );
    if (trackPiece) {
      trackPiece.strength = ((trackPiece.strength || 4) % 4) + 1;
      trackPiece.pulseRemaining = 0.3;
      showNotification(game, 'Spring strength ' + trackPiece.strength + '/4');
    }
  }
}

export function handleKeyDown(game: Game, event: Pick<KeyboardEvent, 'key' | 'preventDefault'>) {
  if (event.key === 'F2') {
    event.preventDefault();
    toggleDebug(game);
    return;
  }
  if (game.state.screen !== 'play') {
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    togglePause(game);
    return;
  }
  if (game.state.paused) {
    return;
  }
  if (event.key === 'Escape') {
    cancelSelection(game);
  }
  if (event.key === 'g' || event.key === 'G') {
    toggleGlove(game);
  }
  if (event.key === 'event' || event.key === 'E') {
    callAnteater(game);
  }
  const index =
    event.key === '0'
      ? 9
      : event.key === '-'
        ? 10
        : event.key === '='
          ? 11
          : parseInt(event.key) - 1;
  if (index >= 0 && index < game.state.availableItems.length) {
    cancelSelection(game);
    game.state.selectedItem = game.state.availableItems[index];
  }
}
