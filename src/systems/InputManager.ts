import { CONSTANTS } from '../config/Constants';

export type GameAction = 'left' | 'right' | 'jump' | 'slide';

export class InputManager {
  private scene: Phaser.Scene;
  private startX = 0;
  private startY = 0;
  private actionCallback: (action: GameAction) => void;
  private enabled = true;

  constructor(scene: Phaser.Scene, callback: (action: GameAction) => void) {
    this.scene = scene;
    this.actionCallback = callback;
    this.setupTouch();
    this.setupKeyboard();
  }

  private setupTouch(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startX = pointer.x;
      this.startY = pointer.y;
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled) return;

      const dx = pointer.x - this.startX;
      const dy = pointer.y - this.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < CONSTANTS.SWIPE_THRESHOLD && absDy < CONSTANTS.SWIPE_THRESHOLD) {
        this.actionCallback('jump');
        return;
      }

      if (absDx > absDy) {
        this.actionCallback(dx > 0 ? 'right' : 'left');
      } else {
        this.actionCallback(dy < 0 ? 'jump' : 'slide');
      }
    });
  }

  private setupKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-LEFT', () => {
      if (this.enabled) this.actionCallback('left');
    });
    keyboard.on('keydown-RIGHT', () => {
      if (this.enabled) this.actionCallback('right');
    });
    keyboard.on('keydown-UP', () => {
      if (this.enabled) this.actionCallback('jump');
    });
    keyboard.on('keydown-DOWN', () => {
      if (this.enabled) this.actionCallback('slide');
    });
    keyboard.on('keydown-S', () => {
      if (this.enabled) this.actionCallback('slide');
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
  }
}
