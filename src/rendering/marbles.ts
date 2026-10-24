import { ITEM_DEFINITIONS } from '../game/definitions';
import type { MarbleType } from '../game/types';
import type { MarbleAppearance, RenderContext } from './context';
import { drawSphere, roundedRect } from './primitives';

export function drawMarbleFace(
  view: RenderContext,
  x: number,
  y: number,
  radius: number,
  type: MarbleType,
  time: number,
) {
  const { ctx } = view;
  const expressions = {
    gold: { eye: '#25251e', pupil: '#25251e', brow: '#70491d', mouth: '#633d22', smile: 1 },
    red: { eye: '#fff8e8', pupil: '#34201a', brow: '#53251e', mouth: '#57231f', smile: 1 },
    blue: { eye: '#f4ffff', pupil: '#315366', brow: '#316785', mouth: '#31566a', smile: 0 },
    twin: { eye: '#fff8dc', pupil: '#423027', brow: '#563c25', mouth: '#52392a', smile: 1 },
    steel: { eye: '#e9f4ed', pupil: '#263c3d', brow: '#354c4c', mouth: '#34494a', smile: 0 },
    bomb: { eye: '#fff1d4', pupil: '#301c18', brow: '#381c17', mouth: '#3b1916', smile: 1 },
    glass: { eye: '#fff', pupil: '#4d7180', brow: '#598493', mouth: '#50707b', smile: -1 },
  };
  const face = expressions[type];
  if (!face) {
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radius / 22, radius / 22);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.clip();
  const phase =
    { gold: 0, red: 1.2, blue: 2.4, twin: 0.6, steel: 1.9, bomb: 3.2, glass: 2.8 }[type] || 0;
  const blink = Math.sin((time || 0) * 2.3 + phase) > 0.992;
  const baseEyeY = type === 'blue' ? 0 : -2;
  for (const side of [-1, 1]) {
    const eyeX = side * 7;
    const eyeY = baseEyeY + (type === 'glass' ? Math.sin(time || 0) * 0.4 : 0);
    ctx.fillStyle = face.eye;
    ctx.beginPath();
    if (blink) {
      ctx.ellipse(eyeX, eyeY, 3.4, 0.8, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(
        eyeX,
        eyeY,
        type === 'steel' ? 2.8 : 3.4,
        type === 'blue' ? 4 : 4.5,
        0,
        0,
        Math.PI * 2,
      );
    }
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = face.pupil;
      ctx.beginPath();
      ctx.arc(eyeX + side * 0.7, eyeY + 0.5, 1.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eyeX - 0.5, eyeY - 1.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = face.brow;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (type === 'red' || type === 'bomb') {
      ctx.moveTo(eyeX - side * 3, eyeY - 6);
      ctx.lineTo(eyeX + side * 2, eyeY - 5);
    } else if (type === 'steel') {
      ctx.moveTo(eyeX - side * 3, eyeY - 4);
      ctx.lineTo(eyeX + side * 3, eyeY - 4.5);
    } else {
      ctx.moveTo(eyeX - 2.5, eyeY - 6);
      ctx.lineTo(eyeX + 2.5, eyeY - 6.5);
    }
    ctx.stroke();
  }
  if (type === 'gold' || type === 'red' || type === 'twin') {
    ctx.fillStyle = 'rgba(232,105,91,.58)';
    ctx.beginPath();
    ctx.ellipse(-13, 5, 2.4, 1.5, -0.2, 0, 7);
    ctx.ellipse(13, 5, 2.4, 1.5, 0.2, 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = face.mouth;
  ctx.fillStyle = face.mouth;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (face.smile > 0) {
    ctx.moveTo(-4.3, 7);
    ctx.quadraticCurveTo(0, 12 + (type === 'bomb' ? 2 : 0), 4.5, 6.8);
    ctx.stroke();
    if (type === 'red' || type === 'bomb') {
      ctx.fillStyle = '#fff2d9';
      ctx.beginPath();
      ctx.moveTo(-2, 8.8);
      ctx.lineTo(2.3, 8.7);
      ctx.lineTo(0.7, 10.4);
      ctx.closePath();
      ctx.fill();
    }
  } else if (face.smile < 0) {
    ctx.ellipse(0, 8, 2.3, 3.1, 0, 0, 7);
    ctx.fill();
  } else {
    ctx.moveTo(-3, 8);
    ctx.quadraticCurveTo(0, 10, 3.5, 7.7);
    ctx.stroke();
  }
  if (type === 'blue') {
    ctx.fillStyle = 'rgba(236,255,255,.9)';
    ctx.beginPath();
    ctx.arc(0, -12, 2.5, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(76,157,193,.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, -8);
    ctx.moveTo(-3.5, -12);
    ctx.lineTo(3.5, -12);
    ctx.stroke();
  }
  if (type === 'glass') {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(13, -11, 1.5, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13, -15);
    ctx.lineTo(13, -7);
    ctx.moveTo(9, -11);
    ctx.lineTo(17, -11);
    ctx.stroke();
  }
  if (type === 'steel') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#d8e4d8';
      ctx.beginPath();
      ctx.arc(side * 18, 0, 1.25, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawMarble(
  view: RenderContext,
  marble: MarbleAppearance,
  centerX: number,
  centerY: number,
  alpha = 1,
) {
  const { ctx, game } = view;
  const definition = ITEM_DEFINITIONS[marble.type];
  ctx.save();
  ctx.globalAlpha = alpha ?? 1;
  const bob = marble.isRolling ? 0 : Math.sin((marble.elapsed || 0) * 3) * 1.5;
  centerY += bob;
  if (game.preferences.marbleStyle === 'original') {
    if (marble.type === 'twin') {
      drawSphere(view, centerX - 10, centerY, 17, definition.color);
      drawSphere(view, centerX + 10, centerY, 17, definition.color);
    } else if (marble.type === 'steel') {
      drawSphere(view, centerX, centerY, 26, definition.color);
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 26, 0, 7);
      ctx.stroke();
    } else if (marble.type === 'bomb') {
      const fuseFlash = marble.touchingAnt && Math.floor((marble.fuseRemaining ?? 0) * 8) % 2;
      drawSphere(
        view,
        centerX,
        centerY,
        22 + (fuseFlash ? 3 : 0),
        fuseFlash ? '#f33' : definition.color,
      );
      ctx.strokeStyle = '#fa0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX + 8, centerY - 18);
      ctx.lineTo(centerX + 16, centerY - 27);
      ctx.stroke();
    } else if (marble.type === 'glass') {
      drawSphere(view, centerX, centerY, 22, definition.color);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 22, 0, 7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.ellipse(centerX - 8, centerY - 10, 5, 3, -0.6, 0, 7);
      ctx.fill();
    } else {
      drawSphere(view, centerX, centerY, 22, definition.color);
    }
    if (marble.type === 'red' || marble.type === 'blue' || marble.type === 'twin') {
      ctx.fillStyle = '#000';
      ctx.fillRect(centerX - 3, centerY + 12, 6, 12);
    }
    if (marble.type === 'gold') {
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', centerX, centerY + 6);
    }
    if (marble.type !== 'bomb') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(centerX - 12, centerY - 2, 6, 6);
      ctx.fillRect(centerX + 4, centerY - 2, 6, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(centerX - 9, centerY, 3, 4);
      ctx.fillRect(centerX + 7, centerY, 3, 4);
    }
  } else {
    const characters = game.preferences.marbleStyle === 'character';
    if (marble.type === 'twin') {
      drawSphere(view, centerX - 10, centerY, 17, definition.color);
      drawSphere(view, centerX + 10, centerY, 17, definition.color);
      if (characters) {
        drawMarbleFace(view, centerX - 10, centerY, 17, 'twin', (marble.elapsed || 0) + 0.4);
        drawMarbleFace(view, centerX + 10, centerY, 17, 'twin', marble.elapsed || 0);
      }
    } else if (marble.type === 'steel') {
      drawSphere(view, centerX, centerY, 26, definition.color);
      ctx.strokeStyle = 'rgba(234,248,245,.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, 7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(62,83,83,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 19, 0, 7);
      ctx.stroke();
    } else if (marble.type === 'bomb') {
      const fuseFlash = marble.touchingAnt && Math.floor((marble.fuseRemaining ?? 0) * 8) % 2;
      drawSphere(
        view,
        centerX,
        centerY,
        22 + (fuseFlash ? 3 : 0),
        fuseFlash ? '#ef5945' : definition.color,
      );
      ctx.strokeStyle = '#e9bd6b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX + 7, centerY - 17);
      ctx.quadraticCurveTo(centerX + 10, centerY - 25, centerX + 17, centerY - 26);
      ctx.stroke();
      ctx.fillStyle = '#f8d17a';
      ctx.beginPath();
      ctx.arc(centerX + 17, centerY - 26, 3, 0, 7);
      ctx.fill();
    } else if (marble.type === 'glass') {
      drawSphere(view, centerX, centerY, 22, definition.color);
      ctx.strokeStyle = 'rgba(237,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 21, 0, 7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.ellipse(centerX - 8, centerY - 10, 5, 3, -0.6, 0, 7);
      ctx.fill();
    } else {
      drawSphere(view, centerX, centerY, 22, definition.color);
    }
    if (characters && marble.type !== 'twin') {
      drawMarbleFace(
        view,
        centerX,
        centerY,
        marble.type === 'steel' ? 26 : 22,
        marble.type,
        marble.elapsed || 0,
      );
    }
    if (marble.type === 'gold' && characters) {
      ctx.fillStyle = '#f8df8d';
      ctx.strokeStyle = '#97622f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX - 7, centerY - 19);
      ctx.lineTo(centerX - 5, centerY - 26);
      ctx.lineTo(centerX, centerY - 21);
      ctx.lineTo(centerX + 4, centerY - 27);
      ctx.lineTo(centerX + 6, centerY - 19);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff2be';
      ctx.beginPath();
      ctx.arc(centerX - 5, centerY - 24, 1.1, 0, 7);
      ctx.arc(centerX + 4, centerY - 25, 1.1, 0, 7);
      ctx.fill();
    }
    if (marble.type === 'gold' && !characters) {
      ctx.fillStyle = '#70491d';
      ctx.font = 'bold 18px Georgia,serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', centerX, centerY + 7);
    }
    if (marble.type === 'bomb' && characters) {
      ctx.strokeStyle = 'rgba(242,213,163,.42)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 17, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  }
  if (marble.health < marble.maxHealth && marble.maxHealth > 1) {
    ctx.fillStyle = 'rgba(21,32,27,.8)';
    roundedRect(view, centerX - 21, centerY - 35, 42, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#a9d17b';
    roundedRect(
      view,
      centerX - 20,
      centerY - 34,
      40 * Math.max(0, marble.health / marble.maxHealth),
      4,
      2,
    );
    ctx.fill();
  }
  if ((marble.poisonRemaining ?? 0) > 0) {
    ctx.fillStyle = '#a8e26d';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', centerX + 24, centerY - 20);
  }
  ctx.restore();
}
