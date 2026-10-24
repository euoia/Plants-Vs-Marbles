import type { DeathAnimation } from '../game/types';
import { drawAnt } from './ants';
import type { RenderContext } from './context';
import { drawMarble } from './marbles';

export function drawDeathAnimation(view: RenderContext, death: DeathAnimation) {
  const { ctx } = view;
  const progress = death.elapsed / death.duration;
  const fade = 1 - progress;
  const burst = Math.min(1, progress * 3);
  ctx.save();
  ctx.globalAlpha = fade;
  if (death.kind === 'marble') {
    ctx.translate(death.x, death.y);
    ctx.rotate(progress * 5);
    ctx.scale(1 + Math.sin(progress * Math.PI) * 0.35, 1 + Math.sin(progress * Math.PI) * 0.35);
    drawMarble(view, death.entity, 0, 0, 1);
    ctx.globalAlpha = fade * 0.8;
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 2;
    for (let index = 0; index < 6; index++) {
      const angle = (index * Math.PI) / 3 + progress * 2;
      const radius = 20 + burst * 18;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.stroke();
    }
  } else {
    ctx.translate(death.x, death.y);
    ctx.rotate(Math.sin(progress * Math.PI) * 0.35);
    ctx.scale(1 + 0.12 * Math.sin(progress * Math.PI), 1 - 0.45 * Math.sin(progress * Math.PI));
    drawAnt(view, { ...death.entity, x: 0, y: 0, emergence: null });
    ctx.globalAlpha = fade * 0.75;
    ctx.fillStyle = '#b88a5b';
    for (let index = 0; index < 5; index++) {
      const angle = index * 1.25 + progress * 4;
      const radius = 18 + burst * 22;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2.5, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}
