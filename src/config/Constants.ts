export const CONSTANTS = {
  LANE_COUNT: 3,
  LANE_WIDTH: 120,
  INITIAL_SPEED: 350,
  MAX_SPEED: 1100,
  MAX_LEVEL: 10,
  LEVEL_DISTANCE: 3000,       // Distance (px) traveled to advance one level
  LANE_SWITCH_DURATION: 80,
  SWIPE_THRESHOLD: 40,
  PLAYER_WIDTH: 40,
  PLAYER_HEIGHT: 70,
  OBSTACLE_WIDTH: 50,
  OBSTACLE_HEIGHT: 60,
  LIVES: 3,
  INVINCIBILITY_DURATION: 2000,
  MIN_OBSTACLE_GAP: 1.2,
  MIN_OBSTACLE_GAP_AT_MAX: 0.6,
  SCORE_PER_10PX: 1,
  DODGE_BONUS: 50,
  NEAR_MISS_BONUS: 100,
  NEAR_MISS_DISTANCE: 20,
  COMBO_INCREMENT: 0.5,
  COMBO_DODGE_THRESHOLD: 5,
  GROUND_Y_OFFSET: 100,
} as const;

export type ObstacleType = 'agent' | 'cameraman' | 'protester';

export interface ObstacleConfig {
  type: ObstacleType;
  spawnWeight: number;
  color: number;
  width: number;
  height: number;
  collisionWidthRatio: number;
  collisionHeightRatio: number;
  canJump: boolean;
  canSlide: boolean;
  canLaneChange: boolean;
  speed: number;
  zigzag: boolean;
}
