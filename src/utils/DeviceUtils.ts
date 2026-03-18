export function getGameWidth(scene: Phaser.Scene): number {
  return scene.cameras.main.width;
}

export function getGameHeight(scene: Phaser.Scene): number {
  return scene.cameras.main.height;
}

export function getLanePositions(scene: Phaser.Scene): number[] {
  const centerX = getGameWidth(scene) / 2;
  const laneWidth = Math.min(120, getGameWidth(scene) / 4);
  return [
    centerX - laneWidth,
    centerX,
    centerX + laneWidth,
  ];
}

export function getGroundY(scene: Phaser.Scene): number {
  return getGameHeight(scene) - 100;
}
