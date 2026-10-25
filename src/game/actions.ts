import {
  ANTEATER_COOLDOWN,
  BOARD_BOTTOM,
  GLOVE_COOLDOWN,
  INITIAL_ROLL_SPEED,
  LANE_COUNT,
  MIN_DROP_Y,
} from './constants';
import { ITEM_DEFINITIONS, isTrackType } from './definitions';
import type { Game, HeldItem, ItemType } from './types';

export function placeItem(game: Game, type: ItemType, lane: number, y: number) {
  const definition = ITEM_DEFINITIONS[type];
  if (!game.debug && game.state.crumbs < definition.cost) {
    showNotification(game, `${definition.name} needs ${definition.cost} crumbs`);
    return false;
  }
  if (!game.debug && game.state.cooldowns[type] > 0) {
    showNotification(
      game,
      `${definition.name} is recharging: ${Math.ceil(game.state.cooldowns[type])}s`,
    );
    return false;
  }
  y = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, y));
  if (isTrackType(type)) {
    const definition = ITEM_DEFINITIONS[type];
    if (
      definition.direction &&
      (lane + definition.direction < 0 || lane + definition.direction >= LANE_COUNT)
    ) {
      showNotification(game, 'No lane that way!');
      return false;
    }
    if (
      game.state.trackPieces.some((marble) => marble.lane === lane && Math.abs(marble.y - y) < 44)
    ) {
      showNotification(game, 'Track piece already there!');
      return false;
    }
    chargeForItem(game, type);
    game.state.trackPieces.push({ type: type, lane: lane, y: y, pulseRemaining: 0, strength: 4 });
    return true;
  }
  const marbleDefinition = ITEM_DEFINITIONS[type];
  chargeForItem(game, type);
  game.state.marbles.push({
    type: type,
    lane: lane,
    y: y,
    health: marbleDefinition.health,
    maxHealth: marbleDefinition.health,
    elapsed: 0,
    fuseRemaining: 0.8,
    touchingAnt: false,
    poisonRemaining: 0,
    velocityY: INITIAL_ROLL_SPEED,
    fallDistance: 0,
    isFalling: true,
    lastTrackPiece:
      game.state.trackPieces.find(
        (candidate) => candidate.lane === lane && Math.abs(candidate.y - y) <= 16,
      ) || null,
    laneOffsetX: 0,
  });
  return true;
}

// Debug mode places for free so that switching it off restores the real crumb count.
function chargeForItem(game: Game, type: ItemType) {
  if (!game.debug) {
    game.state.crumbs -= ITEM_DEFINITIONS[type].cost;
    game.state.cooldowns[type] = ITEM_DEFINITIONS[type].cooldown;
  }
}

export function callAnteater(game: Game) {
  if (game.state.screen !== 'play' || game.state.anteater || !game.state.abilities.eater) {
    return;
  }
  if (game.state.anteaterCooldown > 0) {
    showNotification(game, 'Ant Eater is resting: ' + Math.ceil(game.state.anteaterCooldown) + 's');
    return;
  }
  game.state.anteater = { y: BOARD_BOTTOM + 120 };
  game.state.anteaterCooldown = ANTEATER_COOLDOWN;
}

export function showNotification(game: Game, text: string) {
  game.state.notification = { text, lifeRemaining: 2 };
}

export function toggleDebug(game: Game) {
  if (!game.debugAvailable) {
    return;
  }
  game.debug = !game.debug;
  showNotification(game, 'Debug mode ' + (game.debug ? 'ON: infinite crumbs' : 'OFF'));
}

export function togglePause(game: Game) {
  if (game.state.screen === 'play' && !game.state.confirmingQuit) {
    game.state.paused = !game.state.paused;
  }
}

/** Pauses and asks before leaving, so a stray tap on Main menu cannot end a run. */
export function requestQuit(game: Game) {
  if (game.state.screen !== 'play') {
    return;
  }
  game.state.confirmingQuit = true;
  game.state.paused = true;
}

export function cancelQuit(game: Game) {
  game.state.confirmingQuit = false;
  game.state.paused = false;
}

export function toggleGlove(game: Game) {
  if (game.state.screen !== 'play' || !game.state.abilities.glove) {
    return;
  }
  const wasActive = game.state.gloveActive;
  if (!wasActive && game.state.gloveCooldown > 0) {
    showNotification(game, 'Glove is resting: ' + Math.ceil(game.state.gloveCooldown) + 's');
    return;
  }
  cancelSelection(game);
  game.state.gloveActive = !wasActive;
}

export function cancelSelection(game: Game) {
  if (game.state.heldItem) {
    // put a carried item back where it came from
    const heldItem = game.state.heldItem;
    if (heldItem.isPiece) {
      game.state.trackPieces.push(heldItem.entity);
    } else {
      game.state.marbles.push(heldItem.entity);
    }
  }
  game.state.heldItem = null;
  game.state.selectedItem = null;
  game.state.gloveActive = false;
}

export function findNearestItem(game: Game, lane: number, y: number): HeldItem | null {
  let nearest: HeldItem | null = null;
  for (const marble of game.state.marbles) {
    if (
      marble.lane === lane &&
      Math.abs(marble.y - y) < 34 &&
      (!nearest || Math.abs(marble.y - y) < Math.abs(nearest.entity.y - y))
    ) {
      nearest = { isPiece: false, entity: marble };
    }
  }
  for (const piece of game.state.trackPieces) {
    if (
      piece.lane === lane &&
      Math.abs(piece.y - y) < 24 &&
      (!nearest || Math.abs(piece.y - y) < Math.abs(nearest.entity.y - y))
    ) {
      nearest = { isPiece: true, entity: piece };
    }
  }
  return nearest;
}

export function dropHeldItem(game: Game, lane: number, y: number) {
  const heldItem = game.state.heldItem;
  if (!heldItem) {
    showNotification(game, 'Pick up an item before putting it down.');
    return;
  }
  y = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, y));
  if (heldItem.isPiece) {
    const entity = heldItem.entity;
    const direction = ITEM_DEFINITIONS[entity.type].direction;
    if (direction && (lane + direction < 0 || lane + direction >= LANE_COUNT)) {
      showNotification(game, 'No lane that way!');
      return;
    }
    if (
      game.state.trackPieces.some((marble) => marble.lane === lane && Math.abs(marble.y - y) < 44)
    ) {
      showNotification(game, 'Track piece already there!');
      return;
    }
    entity.lane = lane;
    entity.y = y;
    game.state.trackPieces.push(entity);
  } else {
    const entity = heldItem.entity;
    entity.lane = lane;
    entity.y = y;
    entity.velocityY = INITIAL_ROLL_SPEED;
    entity.isFalling = false;
    entity.fallDistance = 0;
    entity.boosted = false;
    entity.laneOffsetX = 0;
    entity.lastTrackPiece =
      game.state.trackPieces.find(
        (candidate) => candidate.lane === lane && Math.abs(candidate.y - y) <= 16,
      ) || null;
    game.state.marbles.push(entity);
  }
  game.state.heldItem = null;
  game.state.gloveActive = false;
  game.state.gloveCooldown = GLOVE_COOLDOWN; // cooldown starts once an item is put down
}
