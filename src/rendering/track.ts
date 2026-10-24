import { ITEM_DEFINITIONS, isTrackType } from '../game/definitions';
import type { ItemType, TrackPiece, TrackType } from '../game/types';
import type { RenderContext } from './context';
import { drawMarble } from './marbles';
import { roundedRect } from './primitives';

export function drawItemPreview(
  view: RenderContext,
  type: ItemType,
  centerX: number,
  centerY: number,
) {
  if (isTrackType(type)) {
    drawTrackPiece(view, type, centerX, centerY, 0.6);
  } else {
    drawMarble(
      view,
      { type: type, elapsed: 0, health: 1, maxHealth: 1, touchingAnt: false },
      centerX,
      centerY,
      0.55,
    );
  }
}

export function drawTrackPiece(
  view: RenderContext,
  type: TrackType,
  centerX: number,
  centerY: number,
  alpha: number,
  trackPiece?: TrackPiece,
) {
  const { ctx } = view;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (type === 'spring') {
    const compression =
      trackPiece && trackPiece.pulseRemaining > 0 ? trackPiece.pulseRemaining * 30 : 0;
    const height = 22 - compression * 0.5;
    ctx.fillStyle = 'rgba(13,26,20,.28)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 15, 30, 8, 0, 0, 7);
    ctx.fill();
    const metal = ctx.createLinearGradient(centerX - 20, centerY, centerX + 20, centerY);
    metal.addColorStop(0, '#49665e');
    metal.addColorStop(0.5, '#bdd9bd');
    metal.addColorStop(1, '#486158');
    ctx.fillStyle = metal;
    roundedRect(view, centerX - 24, centerY + 8, 48, 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#f3be54';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - 18, centerY + 11);
    for (let index = 0; index < 5; index++) {
      ctx.lineTo(centerX + (index % 2 ? -18 : 18), centerY + 11 - ((index + 1) * height) / 5);
    }
    ctx.stroke();
    const cap = ctx.createLinearGradient(centerX, centerY - height, centerX, centerY - height + 9);
    cap.addColorStop(0, '#fff1ac');
    cap.addColorStop(1, '#dc9139');
    ctx.fillStyle = cap;
    roundedRect(view, centerX - 25, centerY + 7 - height, 50, 8, 4);
    ctx.fill();
    if (trackPiece) {
      const strength = trackPiece.strength || 4;
      for (let index = 0; index < 4; index++) {
        ctx.fillStyle = index < strength ? '#ed9d43' : 'rgba(0,0,0,.35)';
        roundedRect(view, centerX - 25 + index * 13, centerY + 20, 10, 4, 2);
        ctx.fill();
      }
    }
  } else if (type === 'ring') {
    const isPulsing = trackPiece && trackPiece.pulseRemaining > 0;
    ctx.fillStyle = 'rgba(13,26,20,.25)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 8, 31, 11, 0, 0, 7);
    ctx.fill();
    const gold = ctx.createLinearGradient(centerX - 24, centerY - 16, centerX + 25, centerY + 15);
    gold.addColorStop(0, '#fff3a6');
    gold.addColorStop(0.4, isPulsing ? '#fff5c0' : '#f4c45d');
    gold.addColorStop(1, '#a86131');
    ctx.strokeStyle = gold;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 30, isPulsing ? 22 : 18, 0, 0, 7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,235,.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 1, 30, isPulsing ? 22 : 18, 0, 3.6, 5.6);
    ctx.stroke();
  } else if (type === 'boost') {
    const isPulsing = trackPiece && trackPiece.pulseRemaining > 0;
    ctx.fillStyle = 'rgba(13,26,20,.28)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 16, 35, 8, 0, 0, 7);
    ctx.fill();
    const plate = ctx.createLinearGradient(centerX, centerY - 15, centerX, centerY + 15);
    plate.addColorStop(0, isPulsing ? '#ffb36c' : '#dc8050');
    plate.addColorStop(1, '#8b493c');
    ctx.fillStyle = plate;
    roundedRect(view, centerX - 30, centerY - 13, 60, 26, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffe4a0';
    ctx.lineWidth = 2.5;
    for (let index = 0; index < 2; index++) {
      const y = centerY - 7 + index * 9;
      ctx.beginPath();
      ctx.moveTo(centerX - 13, y);
      ctx.lineTo(centerX, y + 7);
      ctx.lineTo(centerX + 13, y);
      ctx.stroke();
    }
  } else {
    const direction = ITEM_DEFINITIONS[type].direction;
    ctx.fillStyle = 'rgba(13,26,20,.25)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 12, 34, 8, 0, 0, 7);
    ctx.fill();
    const wood = ctx.createLinearGradient(centerX, centerY - 16, centerX, centerY + 16);
    wood.addColorStop(0, '#d4a86d');
    wood.addColorStop(0.48, '#8a6142');
    wood.addColorStop(1, '#543b31');
    ctx.fillStyle = wood;
    ctx.strokeStyle = '#392d28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 34 * direction, centerY - 14);
    ctx.lineTo(centerX - 34 * direction, centerY - 4);
    ctx.lineTo(centerX + 34 * direction, centerY + 16);
    ctx.lineTo(centerX + 34 * direction, centerY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,226,174,.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 29 * direction, centerY - 8);
    ctx.lineTo(centerX + 29 * direction, centerY + 10);
    ctx.stroke();
    ctx.fillStyle = '#f3db9c';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(direction > 0 ? '▶' : '◀', centerX, centerY + 6);
  }
  ctx.restore();
}
