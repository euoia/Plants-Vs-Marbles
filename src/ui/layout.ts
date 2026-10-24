import {
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  LANE_COUNT,
  LANE_WIDTH,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import type { Point, Rectangle } from '../game/types';

export const PAUSE_BUTTON = { x: 20, y: BOARD_Y + 52, width: 130, height: 28 };
export const MENU_BUTTON = { x: 20, y: BOARD_Y + 86, width: 130, height: 28 };
export const TOOL_BUTTONS = { eater: { x: 680, width: 68 }, glove: { x: 752, width: 138 } };
export const toolbarSlot = (index: number) => ({
  x: 103 + index * 48,
  y: 8,
  width: 44,
  height: 88,
});
export const debugAntButton = (index: number) => ({
  x: 4 + index * 74,
  y: BOARD_BOTTOM + 14,
  width: 70,
  height: 30,
});
export const containsPoint = (point: Point, bounds: Rectangle) =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

export function laneAt(point: Point) {
  const lane = Math.floor((point.x - BOARD_X) / LANE_WIDTH);
  return lane >= 0 && lane < LANE_COUNT && point.y >= TOOLBAR_HEIGHT && point.y <= BOARD_BOTTOM + 30
    ? lane
    : -1;
}
