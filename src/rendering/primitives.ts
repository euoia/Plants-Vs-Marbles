import type { RenderContext } from './context';

export function drawSphere(
  view: RenderContext,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const { ctx, game } = view;
  ctx.save();
  if (game.preferences.marbleStyle === 'original') {
    const original = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.35,
      radius * 0.1,
      x,
      y,
      radius,
    );
    original.addColorStop(0, '#fff');
    original.addColorStop(0.25, color);
    original.addColorStop(1, '#000');
    ctx.fillStyle = original;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 7);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(11,24,20,.28)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + radius * 0.76, radius * 0.86, radius * 0.25, 0, 0, 7);
  ctx.fill();
  const gradient = ctx.createRadialGradient(
    x - radius * 0.38,
    y - radius * 0.46,
    radius * 0.06,
    x,
    y,
    radius * 1.12,
  );
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.13, '#fff9');
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(0.78, color);
  gradient.addColorStop(1, '#17251f');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.42)';
  ctx.lineWidth = Math.max(1, radius * 0.065);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.94, Math.PI * 1.08, Math.PI * 1.88);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.34, y - radius * 0.42, radius * 0.22, radius * 0.12, -0.5, 0, 7);
  ctx.fill();
  ctx.restore();
}

export function roundedRect(
  view: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const { ctx } = view;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
