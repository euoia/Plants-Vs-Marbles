import {
  callAnteater,
  cancelQuit,
  cancelSelection,
  dropHeldItem,
  findNearestItem,
  placeItem,
  requestQuit,
  showNotification,
  toggleDebug,
  toggleGlove,
  togglePause,
} from '../game/actions';
import { spawnAnt } from '../game/combat';
import { CANVAS_HEIGHT, CANVAS_WIDTH, LANE_COUNT, TOOLBAR_HEIGHT } from '../game/constants';
import { ANT_TYPES } from '../game/definitions';
import { resetGame } from '../game/game';
import { advanceTutorial, currentTutorialStep, finishTutorial } from '../game/tutorial';
import type { Game, Point } from '../game/types';
import {
  containsPoint,
  debugAntButton,
  laneAt,
  MENU_BUTTON,
  PAUSE_BUTTON,
  QUIT_KEEP_BUTTON,
  QUIT_LEAVE_BUTTON,
  TOOL_BUTTONS,
  toolbarSlot,
  TUTORIAL_NEXT_BUTTON,
  TUTORIAL_SKIP_BUTTON,
} from './layout';
import { getMenuButtons } from './menus';

// The backing store is scaled for the screen's pixel density, so map to the fixed game
// coordinates rather than to canvas.width/height.
export function canvasPoint(
  canvas: Pick<HTMLCanvasElement, 'getBoundingClientRect'>,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): Point {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) * CANVAS_WIDTH) / bounds.width,
    y: ((event.clientY - bounds.top) * CANVAS_HEIGHT) / bounds.height,
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
        // touch has no hover, so the press is the first time we learn where the pointer is
        game.state.pointer = canvasPoint(canvas, pointerEvent);
        handlePointerDown(game, game.state.pointer);
      }
    },
    options,
  );
  canvas.addEventListener(
    'pointerup',
    (event) => {
      if ((event as PointerEvent).pointerType === 'touch') {
        // stop the last tapped button from looking hovered on the next screen
        game.state.pointer = { x: -1, y: -1 };
      }
    },
    options,
  );
  window.addEventListener('keydown', (event) => handleKeyDown(game, event), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && game.state.screen === 'play' && !game.state.paused) {
        togglePause(game);
      }
    },
    options,
  );
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
  if (game.state.confirmingQuit) {
    if (containsPoint(point, QUIT_LEAVE_BUTTON) || containsPoint(point, MENU_BUTTON)) {
      resetGame(game);
    } else if (containsPoint(point, QUIT_KEEP_BUTTON)) {
      cancelQuit(game);
    }
    return;
  }
  if (containsPoint(point, MENU_BUTTON)) {
    requestQuit(game);
    return;
  }
  if (containsPoint(point, PAUSE_BUTTON)) {
    togglePause(game);
    return;
  }
  if (game.state.paused) {
    return;
  }
  const tutorialStep = currentTutorialStep(game);
  if (tutorialStep) {
    if (containsPoint(point, TUTORIAL_SKIP_BUTTON)) {
      finishTutorial(game);
      return;
    }
    if (containsPoint(point, TUTORIAL_NEXT_BUTTON)) {
      if (!tutorialStep.isComplete) {
        advanceTutorial(game);
      }
      return;
    }
  }
  if (game.debug) {
    for (let index = 0; index < ANT_TYPES.length; index++) {
      if (containsPoint(point, debugAntButton(index))) {
        spawnAnt(game, ANT_TYPES[index], Math.floor(game.random() * LANE_COUNT));
        return;
      }
    }
  }
  // the toolbar is drawn over falling crumbs, so it gets the click first
  if (point.y >= TOOLBAR_HEIGHT) {
    for (const drop of game.state.crumbDrops) {
      if (Math.hypot(drop.x - point.x, drop.y - point.y) < 24) {
        game.state.crumbs += drop.value;
        drop.lifeRemaining = 0;
        return;
      }
    }
  }
  if (point.y < TOOLBAR_HEIGHT) {
    for (const [index, key] of game.state.availableItems.entries()) {
      if (containsPoint(point, toolbarSlot(index))) {
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

export function handleKeyDown(
  game: Game,
  event: Pick<KeyboardEvent, 'key' | 'preventDefault'> &
    Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>>,
) {
  if (event.key === 'F2' && game.debugAvailable) {
    event.preventDefault();
    toggleDebug(game);
    return;
  }
  // leave browser shortcuts such as Cmd+1 (switch tab) and Ctrl+- (zoom out) alone
  if (game.state.screen !== 'play' || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (game.state.confirmingQuit) {
    if (event.key === 'Escape') {
      cancelQuit(game);
    }
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
  if (event.key === 'e' || event.key === 'E') {
    callAnteater(game);
  }
  const tutorialStep = currentTutorialStep(game);
  if (event.key === 'Enter' && tutorialStep && !tutorialStep.isComplete) {
    advanceTutorial(game);
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
