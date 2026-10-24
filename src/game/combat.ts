import {
  ANT_HILL_Y,
  BOARD_X,
  DEATH_ANIMATION_DURATION,
  EMERGENCE_DURATION,
  LANE_COUNT,
  LANE_WIDTH,
  QUEEN_BOMB_DAMAGE,
  SHARD_COUNT,
  SHARD_DURABILITY,
  SHARD_LIFETIME,
  laneCenterX,
} from './constants';
import { ANT_DEFINITIONS } from './definitions';
import type { Ant, AntType, DeathAnimation, Game, Marble } from './types';

export function shatterMarble(game: Game, marble: Marble) {
  const x = laneCenterX(marble.lane);
  const y = marble.y;
  for (let index = 0; index < SHARD_COUNT; index++) {
    game.state.shards.push({
      lane: marble.lane,
      x: x + (game.random() - 0.5) * LANE_WIDTH * 0.8,
      y: y + (game.random() - 0.3) * 50,
      lifeRemaining: SHARD_LIFETIME,
      durability: SHARD_DURABILITY,
      rotation: game.random() * 6,
      size: 5 + game.random() * 5,
    });
  }
  game.state.effects.push({ x: x, y: y, elapsed: 0, duration: 0.35, kind: 'puff' });
  marble.health = 0;
}

export function explodeMarble(game: Game, marble: Marble) {
  const x = laneCenterX(marble.lane);
  const y = marble.y;
  for (const ant of game.state.ants) {
    if (!ant.emergence) {
      if (ant.spansAllLanes) {
        if (Math.abs(ant.y - y) < 130) {
          damageAnt(ant, QUEEN_BOMB_DAMAGE);
        }
      } else if (
        !(ant.traversal && ant.traversal.dig) &&
        Math.abs(ant.x - x) < LANE_WIDTH * 1.6 &&
        Math.abs(ant.y - y) < 130
      ) {
        damageAnt(ant, 99999);
      }
    }
  }
  game.state.effects.push({ x: x, y: y, elapsed: 0, duration: 0.5, kind: 'boom' });
  marble.health = 0;
  marble.exploded = true;
}

export function damageAnt(ant: Ant, damage: number, isProjectile = false) {
  ant.flashRemaining = 0.1;
  if (isProjectile && ant.armor > 0) {
    ant.armor -= damage * 0.6;
    return;
  }
  ant.health -= damage;
}

export function queueDeathAnimation(
  game: Game,
  kind: DeathAnimation['kind'],
  entity: Ant | Marble,
  x: number,
  y: number,
) {
  if (entity.deathQueued) {
    return;
  }
  entity.deathQueued = true;
  const animation = { x, y, elapsed: 0, duration: DEATH_ANIMATION_DURATION };
  if (kind === 'ant' && 'x' in entity) {
    game.state.deaths.push({
      ...animation,
      kind,
      entity: { ...entity, traversal: null, emergence: null },
    });
  } else if (kind === 'marble' && !('x' in entity)) {
    game.state.deaths.push({ ...animation, kind, entity: { ...entity } });
  } else {
    throw new Error('Death animation kind does not match its entity.');
  }
}

export function beginEmergence(ant: Ant, delay = 0) {
  const size = ANT_DEFINITIONS[ant.type].size;
  const from = ANT_HILL_Y + (ant.spansAllLanes ? 75 : 30 * size);
  const to = ANT_HILL_Y - (ant.spansAllLanes ? 218 : 30 * size);
  ant.y = from;
  ant.emergence = {
    elapsed: -delay,
    duration: ant.spansAllLanes ? 1.8 : EMERGENCE_DURATION,
    startY: from,
    endY: to,
  };
  return ant;
}

export function spawnAnt(game: Game, type: AntType, lane: number, count?: number) {
  const definition = ANT_DEFINITIONS[type];
  count = count || definition.group || 1;
  if (definition.spansAllLanes) {
    game.state.ants.push(
      beginEmergence({
        type: type,
        lane: 2,
        spansAllLanes: true,
        x: BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2,
        y: 0,
        health: definition.health,
        maxHealth: definition.health,
        armor: 0,
        slowRemaining: 0,
        flashRemaining: 0,
        animationPhase: 0,
        hasJumped: false,
        traversal: null,
        jumpHeight: 0,
        spitCooldown: 1,
        broodRemaining: definition.broodInterval,
      }),
    );
    return;
  }
  for (let index = 0; index < count; index++) {
    game.state.ants.push(
      beginEmergence(
        {
          type: type,
          lane: lane,
          x:
            laneCenterX(lane) +
            (count > 5 ? ((index % 3) - 1) * 16 : count > 1 ? (index % 2 ? 10 : -10) : 0),
          y: 0,
          health: definition.health * (game.state.antHealthMultiplier || 1),
          maxHealth: definition.health * (game.state.antHealthMultiplier || 1),
          armor: definition.armor || 0,
          slowRemaining: 0,
          flashRemaining: 0,
          animationPhase: game.random() * 6,
          hasJumped: false,
          traversal: null,
          jumpHeight: 0,
          spitCooldown: 1 + game.random(),
          digsRemaining: definition.burrowCount || 0,
        },
        index * 0.22,
      ),
    );
  }
}

export function fireProjectile(game: Game, marble: Marble, ice: boolean) {
  game.state.projectiles.push({
    x: laneCenterX(marble.lane),
    lane: marble.lane,
    y: marble.y + 24,
    ice: ice,
  });
}
