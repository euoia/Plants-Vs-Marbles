import {
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  LANE_COUNT,
  LANE_LENGTH,
  LANE_WIDTH,
  laneCenterX,
  MIN_DROP_Y,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import { ANT_DEFINITIONS, ANT_TYPES, CAMPAIGN_LEVELS } from '../game/definitions';
import { debugAntButton, laneAt, MENU_BUTTON, PAUSE_BUTTON } from '../ui/layout';
import { drawAnt, drawAnteater } from './ants';
import { drawBoard } from './board';
import type { RenderContext } from './context';
import { drawDeathAnimation } from './effects';
import { drawMenuOverlay, drawToolbar } from './hud';
import { drawMarble } from './marbles';
import { drawSphere, roundedRect } from './primitives';
import { drawItemPreview, drawTrackPiece } from './track';

export function renderGame(view: RenderContext) {
  drawBoard(view);
  drawDebugPanel(view);
  drawPlacementPreview(view);
  drawEntities(view);
  drawStatus(view);
}

function drawDebugPanel(view: RenderContext) {
  const { ctx, canvas, game } = view;
  if (game.debug && game.state.screen === 'play') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, BOARD_BOTTOM + 8, canvas.width, canvas.height - BOARD_BOTTOM - 8);
    ANT_TYPES.forEach((type, index) => {
      const button = debugAntButton(index);
      ctx.fillStyle = ANT_DEFINITIONS[type].color;
      ctx.fillRect(button.x, button.y, button.width, button.height);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(type, button.x + button.width / 2, button.y + 19);
    });
  }
}

function drawPlacementPreview(view: RenderContext) {
  const { ctx, game } = view;
  if ((game.state.selectedItem || game.state.gloveActive) && game.state.screen === 'play') {
    const lane = laneAt(game.state.pointer);
    if (lane >= 0) {
      if (game.state.heldItem) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
        const previewY = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, game.state.pointer.y));
        if (game.state.heldItem.isPiece) {
          drawTrackPiece(
            view,
            game.state.heldItem.entity.type,
            laneCenterX(lane),
            previewY,
            0.7,
            game.state.heldItem.entity,
          );
        } else {
          drawMarble(view, game.state.heldItem.entity, laneCenterX(lane), previewY, 0.7);
        }
      } else if (game.state.gloveActive) {
        ctx.fillStyle = 'rgba(100,200,255,.2)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
      } else if (game.state.selectedItem) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
        const previewY = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, game.state.pointer.y));
        drawItemPreview(view, game.state.selectedItem, laneCenterX(lane), previewY);
      }
    }
  }
}

function drawEntities(view: RenderContext) {
  const { ctx, game } = view;
  for (const shard of game.state.shards) {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);
    ctx.globalAlpha = Math.min(1, shard.lifeRemaining / 5);
    ctx.fillStyle = 'rgba(179,229,252,.85)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -shard.size);
    ctx.lineTo(shard.size * 0.7, shard.size * 0.6);
    ctx.lineTo(-shard.size * 0.7, shard.size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  for (const trackPiece of game.state.trackPieces) {
    drawTrackPiece(
      view,
      trackPiece.type,
      laneCenterX(trackPiece.lane),
      trackPiece.y,
      1,
      trackPiece,
    );
  }
  for (const marble of game.state.marbles) {
    drawMarble(view, marble, laneCenterX(marble.lane) + (marble.laneOffsetX || 0), marble.y);
  }
  for (const drop of game.state.deaths) {
    drawDeathAnimation(view, drop);
  }
  for (const ant of game.state.ants) {
    drawAnt(view, ant);
  }
  if (game.state.anteater) {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      drawAnteater(view, laneCenterX(lane), game.state.anteater.y, 1, 1);
    }
  }
  for (const shard of game.state.projectiles) {
    drawSphere(view, shard.x, shard.y, 6, shard.ice ? '#8cf' : '#f66');
  }
  for (const effect of game.state.effects) {
    const type = effect.elapsed / effect.duration;
    if (effect.kind === 'boom') {
      ctx.fillStyle = `rgba(255,${(180 - type * 150) | 0},0,${1 - type})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 40 + type * 120, 0, 7);
      ctx.fill();
    } else if (effect.kind === 'spit') {
      ctx.fillStyle = '#76ff03';
      ctx.beginPath();
      ctx.arc(
        effect.x + (effect.targetX - effect.x) * type,
        effect.y + (effect.targetY - effect.y) * type,
        6,
        0,
        7,
      );
      ctx.fill();
    } else if (effect.kind === 'dmg') {
      ctx.fillStyle = `rgba(255,235,59,${1 - type})`;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(effect.text, effect.x, effect.y - type * 30);
    } else {
      ctx.fillStyle = `rgba(200,200,200,${1 - type})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 10 + type * 20, 0, 7);
      ctx.fill();
    }
  }
  for (const drop of game.state.crumbDrops) {
    drawSphere(view, drop.x, drop.y, 14, '#ffd54f');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('25', drop.x, drop.y + 5);
  }
  drawToolbar(view);
}

function drawStatus(view: RenderContext) {
  const { ctx, canvas, game } = view;
  const invasionProgress = Math.min(1, game.state.elapsed / game.state.invasionDuration);
  ctx.fillStyle = 'rgba(21,39,31,.8)';
  roundedRect(view, 16, BOARD_Y + 10, 156, 51, 12);
  ctx.fill();
  ctx.fillStyle = '#e7e9cd';
  ctx.font = 'bold 11px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('INVASION', 28, BOARD_Y + 28);
  ctx.fillStyle = 'rgba(8,22,17,.75)';
  roundedRect(view, 28, BOARD_Y + 36, 132, 8, 4);
  ctx.fill();
  const progress = ctx.createLinearGradient(28, 0, 160, 0);
  progress.addColorStop(0, '#e78b54');
  progress.addColorStop(1, '#e6c46b');
  ctx.fillStyle = progress;
  roundedRect(view, 28, BOARD_Y + 36, 132 * invasionProgress, 8, 4);
  ctx.fill();
  if (game.state.notification) {
    ctx.fillStyle = '#ff8a80';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      game.state.notification.text,
      BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2,
      BOARD_Y + LANE_LENGTH / 2,
    );
  }
  if (game.state.screen === 'play') {
    const button = PAUSE_BUTTON;
    ctx.fillStyle = game.state.paused ? '#e3cb88' : 'rgba(21,39,31,.82)';
    roundedRect(view, button.x, button.y, button.width, button.height, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,220,168,.55)';
    ctx.lineWidth = 1;
    roundedRect(view, button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1, 8);
    ctx.stroke();
    ctx.fillStyle = '#f7f0dc';
    ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      game.state.paused ? '▶ Resume (P)' : '⏸ Pause (P)',
      button.x + button.width / 2,
      button.y + 19,
    );
    const menuButton = MENU_BUTTON;
    ctx.fillStyle = 'rgba(21,39,31,.82)';
    roundedRect(view, menuButton.x, menuButton.y, menuButton.width, menuButton.height, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,220,168,.55)';
    roundedRect(
      view,
      menuButton.x + 0.5,
      menuButton.y + 0.5,
      menuButton.width - 1,
      menuButton.height - 1,
      8,
    );
    ctx.stroke();
    ctx.fillStyle = '#f7f0dc';
    ctx.fillText('☰  Main menu', menuButton.x + menuButton.width / 2, menuButton.y + 19);
    if (game.mode === 'campaign') {
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Level ' + (game.levelIndex + 1), 20, BOARD_Y + 138);
      ctx.font = '12px sans-serif';
      ctx.fillText(CAMPAIGN_LEVELS[game.levelIndex].name, 20, BOARD_Y + 156);
    }
  }
  if (game.state.screen !== 'play') {
    drawMenuOverlay(view);
  } else if (game.state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, TOOLBAR_HEIGHT, canvas.width, canvas.height - TOOLBAR_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('Paused', BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2, BOARD_Y + LANE_LENGTH / 2);
    ctx.font = '18px sans-serif';
    ctx.fillText(
      'Press P or click Resume',
      BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2,
      BOARD_Y + LANE_LENGTH / 2 + 34,
    );
  }
}
