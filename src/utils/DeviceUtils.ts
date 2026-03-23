export function getGameWidth(scene: Phaser.Scene): number {
  return scene.cameras.main.width;
}

export function getGameHeight(scene: Phaser.Scene): number {
  return scene.cameras.main.height;
}

/** Returns the left and right x-coordinates of the road surface. */
export function getRoadBounds(scene: Phaser.Scene): { left: number; right: number } {
  const width = getGameWidth(scene);
  return { left: width * 0.15, right: width * 0.85 };
}

/**
 * Compute lane center positions so that even the widest sprite (maxSpriteWidth)
 * stays fully within the road boundaries.
 */
export function getLanePositions(scene: Phaser.Scene): number[] {
  const { left, right } = getRoadBounds(scene);
  const laneCount = 3;
  const laneWidth = (right - left) / laneCount;
  return Array.from({ length: laneCount }, (_, i) =>
    left + laneWidth * (i + 0.5)
  );
}

/** Clamp an x position so a sprite of the given width stays within road bounds. */
export function clampToRoad(scene: Phaser.Scene, x: number, spriteWidth: number): number {
  const { left, right } = getRoadBounds(scene);
  const halfW = spriteWidth / 2;
  return Math.max(left + halfW, Math.min(right - halfW, x));
}

export function getGroundY(scene: Phaser.Scene): number {
  return getGameHeight(scene) - 100;
}
