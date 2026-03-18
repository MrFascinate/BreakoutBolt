import { CONSTANTS } from '../config/Constants';

export class ScoreManager {
  private score = 0;
  private distance = 0;
  private combo = 0;
  private comboMultiplier = 1;
  private consecutiveDodges = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addDistance(pixels: number): void {
    this.distance += pixels;
    this.score += Math.floor(pixels / 10) * CONSTANTS.SCORE_PER_10PX;
  }

  addDodgeBonus(): void {
    this.consecutiveDodges++;
    if (this.consecutiveDodges % CONSTANTS.COMBO_DODGE_THRESHOLD === 0) {
      this.comboMultiplier += CONSTANTS.COMBO_INCREMENT;
    }
    this.score += Math.floor(CONSTANTS.DODGE_BONUS * this.comboMultiplier);
    this.scene.events.emit('score-updated');
  }

  addNearMissBonus(): void {
    this.score += Math.floor(CONSTANTS.NEAR_MISS_BONUS * this.comboMultiplier);
    this.scene.events.emit('near-miss');
    this.scene.events.emit('score-updated');
  }

  resetCombo(): void {
    this.consecutiveDodges = 0;
    this.comboMultiplier = 1;
  }

  getScore(): number {
    return this.score;
  }

  getDistance(): number {
    return this.distance;
  }

  getDistanceFormatted(): string {
    const km = this.distance / 10000;
    return `${km.toFixed(2)} km`;
  }

  getComboMultiplier(): number {
    return this.comboMultiplier;
  }

  reset(): void {
    this.score = 0;
    this.distance = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.consecutiveDodges = 0;
  }
}
