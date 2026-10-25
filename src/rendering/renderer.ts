import {
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LANE_COUNT,
  LANE_LENGTH,
  LANE_WIDTH,
  laneCenterX,
  MIN_DROP_Y,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import { ANT_DEFINITIONS, ANT_TYPES, CAMPAIGN_LEVELS } from '../game/definitions';
import {
  currentTutorialStep,
  TUTORIAL_ANT_LANE,
  TUTORIAL_STEPS,
  type TutorialTarget,
} from '../game/tutorial';
import type { Game, Rectangle } from '../game/types';
import {
  containsPoint,
  debugAntButton,
  laneAt,
  MENU_BUTTON,
  PAUSE_BUTTON,
  QUIT_KEEP_BUTTON,
  QUIT_LEAVE_BUTTON,
  toolbarSlot,
  TUTORIAL_CARD,
  TUTORIAL_NEXT_BUTTON,
  TUTORIAL_SKIP_BUTTON,
} from '../ui/layout';
import { drawAnt, drawAnteater } from './ants';
import { drawBoard } from './board';
import type { RenderContext } from './context';
import { drawDeathAnimation } from './effects';
import { drawMenuOverlay, drawToolbar, wrapText } from './hud';
import { drawMarble } from './marbles';
import { drawSphere, roundedRect } from './primitives';
import { drawItemPreview, drawTrackPiece } from './track';

export function renderGame(view: RenderContext) {
  // draw in fixed 900x700 game units; main.ts sizes the backing store for the screen's density
  const { ctx, canvas } = view;
  ctx.setTransform(canvas.width / CANVAS_WIDTH, 0, 0, canvas.height / CANVAS_HEIGHT, 0, 0);
  drawBoard(view);
  drawDebugPanel(view);
  drawPlacementPreview(view);
  drawEntities(view);
  drawStatus(view);
}

function drawDebugPanel(view: RenderContext) {
  const { ctx, game } = view;
  if (game.debug && game.state.screen === 'play') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, BOARD_BOTTOM + 8, CANVAS_WIDTH, CANVAS_HEIGHT - BOARD_BOTTOM - 8);
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
  const { ctx, game } = view;
  if (!game.state.tutorial) {
    drawInvasionProgress(view);
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
      ctx.fillText('Level ' + (game.levelIndex + 1), 20, BOARD_Y + 155);
      ctx.font = '12px sans-serif';
      ctx.fillText(CAMPAIGN_LEVELS[game.levelIndex].name, 20, BOARD_Y + 173);
    }
  }
  if (game.state.screen === 'play' && !game.state.paused) {
    drawTutorial(view);
  }
  if (game.state.screen !== 'play') {
    drawMenuOverlay(view);
  } else if (game.state.paused) {
    const centerX = BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, TOOLBAR_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - TOOLBAR_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    if (game.state.confirmingQuit) {
      ctx.font = 'bold 36px "Trebuchet MS",sans-serif';
      ctx.fillText('Leave this game?', centerX, 330);
      ctx.font = '17px "Trebuchet MS",sans-serif';
      ctx.fillText('Your progress in this level will be lost.', centerX, 364);
      drawButton(view, QUIT_LEAVE_BUTTON, 'Leave', false);
      drawButton(view, QUIT_KEEP_BUTTON, 'Keep playing (Esc)', true);
    } else {
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('Paused', centerX, BOARD_Y + LANE_LENGTH / 2);
      ctx.font = '18px sans-serif';
      ctx.fillText('Press P or click Resume', centerX, BOARD_Y + LANE_LENGTH / 2 + 34);
    }
  }
  drawNotification(view);
}

function drawInvasionProgress(view: RenderContext) {
  const { ctx, game } = view;
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
}

// Drawn last so that it stays readable over pause, quit and win/lose overlays.
function drawNotification(view: RenderContext) {
  const { ctx, game } = view;
  const notification = game.state.notification;
  if (!notification) {
    return;
  }
  const centerX = BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2;
  const y = BOARD_Y + 40;
  ctx.save();
  ctx.globalAlpha = Math.min(1, notification.lifeRemaining / 0.3);
  ctx.font = 'bold 16px "Trebuchet MS",sans-serif';
  const width = ctx.measureText(notification.text).width + 32;
  ctx.fillStyle = 'rgba(16,31,25,.92)';
  roundedRect(view, centerX - width / 2, y - 18, width, 34, 17);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,220,168,.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fff4d8';
  ctx.textAlign = 'center';
  ctx.fillText(notification.text, centerX, y + 5);
  ctx.restore();
}

function drawButton(view: RenderContext, bounds: Rectangle, label: string, primary: boolean) {
  const { ctx, game } = view;
  const hot = containsPoint(game.state.pointer, bounds);
  ctx.fillStyle = primary ? (hot ? '#e8cd80' : '#c9a463') : hot ? '#526b4b' : 'rgba(21,39,31,.9)';
  roundedRect(view, bounds.x, bounds.y, bounds.width, bounds.height, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,220,168,.6)';
  ctx.lineWidth = 1;
  roundedRect(view, bounds.x + 0.5, bounds.y + 0.5, bounds.width - 1, bounds.height - 1, 9);
  ctx.stroke();
  ctx.fillStyle = primary ? '#2a2418' : '#f7f0dc';
  ctx.font = 'bold 14px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 5);
}

function drawTutorial(view: RenderContext) {
  const { ctx, game } = view;
  const step = currentTutorialStep(game);
  if (!step) {
    return;
  }
  const target = tutorialTargetBounds(game, step.target);
  if (target) {
    const pulse = 0.55 + 0.45 * Math.sin(game.state.elapsed * 5);
    ctx.save();
    ctx.strokeStyle = `rgba(255,222,120,${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    roundedRect(view, target.x - 4, target.y - 4, target.width + 8, target.height + 8, 10);
    ctx.stroke();
    ctx.restore();
  }
  const card = TUTORIAL_CARD;
  ctx.fillStyle = 'rgba(16,31,25,.94)';
  roundedRect(view, card.x, card.y, card.width, card.height, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,204,142,.7)';
  ctx.lineWidth = 2;
  roundedRect(view, card.x + 1, card.y + 1, card.width - 2, card.height - 2, 13);
  ctx.stroke();
  const stepNumber = (game.state.tutorial?.step ?? 0) + 1;
  ctx.fillStyle = '#e8d09a';
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`How to play · ${stepNumber} of ${TUTORIAL_STEPS.length}`, card.x + 14, card.y + 26);
  ctx.fillStyle = '#fff4d8';
  ctx.font = '16px "Trebuchet MS",sans-serif';
  wrapText(step.text, card.width - 28, (text) => ctx.measureText(text).width).forEach(
    (line, index) => ctx.fillText(line, card.x + 14, card.y + 56 + index * 22),
  );
  if (step.isComplete) {
    ctx.fillStyle = '#c9d4b8';
    ctx.font = 'italic 13px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      step.waitingHint ?? 'Your turn',
      TUTORIAL_NEXT_BUTTON.x + TUTORIAL_NEXT_BUTTON.width / 2,
      TUTORIAL_NEXT_BUTTON.y + 22,
    );
  } else {
    drawButton(view, TUTORIAL_NEXT_BUTTON, step.nextLabel ?? 'Next (Enter)', true);
  }
  drawButton(view, TUTORIAL_SKIP_BUTTON, 'Skip tutorial', false);
}

function tutorialTargetBounds(game: Game, target: TutorialTarget): Rectangle | null {
  const boardWidth = LANE_COUNT * LANE_WIDTH;
  switch (target) {
    case 'hills':
      return { x: BOARD_X, y: BOARD_BOTTOM - 4, width: boardWidth, height: 42 };
    case 'crumbs':
      return { x: 10, y: 19, width: 86, height: 73 };
    case 'firstSlot':
      return toolbarSlot(0);
    case 'board':
      return { x: BOARD_X, y: BOARD_Y, width: boardWidth, height: LANE_LENGTH };
    case 'antLane':
      return {
        x: BOARD_X + TUTORIAL_ANT_LANE * LANE_WIDTH,
        y: BOARD_Y,
        width: LANE_WIDTH,
        height: LANE_LENGTH,
      };
    case 'ants': {
      const ant = game.state.ants[0];
      return ant ? { x: ant.x - 28, y: ant.y - 30, width: 56, height: 60 } : null;
    }
    case 'crumbDrop': {
      const drop = game.state.crumbDrops[0];
      return drop ? { x: drop.x - 20, y: drop.y - 20, width: 40, height: 40 } : null;
    }
  }
}
