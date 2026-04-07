import { ObstacleConfig } from './Constants';

export const OBSTACLE_CONFIGS: Record<string, ObstacleConfig> = {
  agent: {
    type: 'agent',
    spawnWeight: 50,
    color: 0x3388ff,       // Bright blue — visible against dark ground
    width: 50,
    height: 70,
    collisionWidthRatio: 0.6,
    collisionHeightRatio: 1.0,
    canJump: false,
    canSlide: false,
    canLaneChange: true,
    speed: 0,
    zigzag: false,
  },
  cameraman: {
    type: 'cameraman',
    spawnWeight: 35,
    color: 0xff2222,       // Bright red
    width: 50,
    height: 55,
    collisionWidthRatio: 0.7,
    collisionHeightRatio: 0.8,
    canJump: true,
    canSlide: false,
    canLaneChange: true,
    speed: 100,
    zigzag: false,
  },
  protester: {
    type: 'protester',
    spawnWeight: 15,
    color: 0xcc44ff,       // Bright purple
    width: 45,
    height: 60,
    collisionWidthRatio: 0.5,
    collisionHeightRatio: 1.0,
    canJump: true,
    canSlide: true,
    canLaneChange: true,
    speed: 0,
    zigzag: true,
  },
};
