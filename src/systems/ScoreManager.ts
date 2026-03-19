import { CONSTANTS } from '../config/Constants';

export class ScoreManager {
  private score = 0;
  private distance = 0;
  private comboMultiplier = 1;
  private consecutiveDodges = 0;

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
  }

  addNearMissBonus(): void {
    this.score += Math.floor(CONSTANTS.NEAR_MISS_BONUS * this.comboMultiplier);
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
    const mi = this.distance / 16093;
    return `${mi.toFixed(2)} mi`;
  }

  getComboMultiplier(): number {
    return this.comboMultiplier;
  }

  reset(): void {
    this.score = 0;
    this.distance = 0;
    this.comboMultiplier = 1;
    this.consecutiveDodges = 0;
  }
}
