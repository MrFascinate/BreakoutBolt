import * as THREE from 'three';
import { CONSTANTS } from '../config/Constants';
import { getHighScore, saveHighScore } from '../utils/HighScore';
import { Game3D } from './Game3D';
import { World } from './World';

type State = 'title' | 'playing' | 'paused' | 'over';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const app = $('app');
const ui = {
  hud: $('hud'), title: $('title'), pause: $('pause'), gameover: $('gameover'),
  distance: $('distance'), lives: $('lives'), score: $('score'), level: $('level'),
  toast: $('toast'), levelUp: $('levelUp'), flash: $('flash'),
  titleBest: $('titleBest'), goTitle: $('goTitle'), goScore: $('goScore'), goBest: $('goBest'),
  newBest: $('newBest'), goLevel: $('goLevel'), goDistance: $('goDistance'),
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.prepend(renderer.domElement);

const world = new World(renderer);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
const CAM_POS = new THREE.Vector3(0, 4.4, 5.6);
const CAM_LOOK = new THREE.Vector3(0, -0.9, -14.4);
const CAM_FOLLOW = 0.75; // how far the camera tracks Bolt across lanes
let shakeUntil = 0;

let state: State = 'title';
let starting = false;

const game = new Game3D(world.scene, {
  livesChanged: (lives) => { ui.lives.textContent = '⚡ '.repeat(Math.max(lives, 0)).trim(); },
  levelChanged: (level) => {
    ui.level.textContent = `LEVEL ${level}`;
    if (level > 1) restartAnim(ui.levelUp, `LEVEL ${level}`);
  },
  nearMiss: () => restartAnim(ui.toast, '+100 CLOSE CALL'),
  hit: () => {
    restartAnim(ui.flash);
    shakeUntil = performance.now() + 100;
  },
  gameOver: (result) => showGameOver(result),
});

/** Re-trigger a CSS animation on an element (toast, level-up, flash). */
function restartAnim(el: HTMLElement, text?: string): void {
  if (text !== undefined) el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function show(...visible: HTMLElement[]): void {
  for (const el of [ui.hud, ui.title, ui.pause, ui.gameover]) {
    el.classList.toggle('hidden', !visible.includes(el));
  }
}

// ---------------------------------------------------------------- screens

function showTitle(): void {
  state = 'title';
  starting = false;
  const best = getHighScore();
  ui.titleBest.textContent = best > 0 ? `High Score: ${best.toLocaleString()}` : '';
  show(ui.title);
}

function startRun(): void {
  if (starting) return;
  starting = true;
  game.reset();
  ui.score.textContent = '0';
  ui.distance.textContent = '0.00 mi';
  for (const el of [ui.toast, ui.levelUp, ui.flash]) el.classList.remove('show');
  state = 'playing';
  show(ui.hud);
  lastFrame = performance.now();
}

function togglePause(): void {
  if (state === 'playing' && !game.isOver()) {
    state = 'paused';
    show(ui.hud, ui.pause);
  } else if (state === 'paused') {
    state = 'playing';
    show(ui.hud);
  }
}

function showGameOver(data: { score: number; distance: string; level: number }): void {
  state = 'over';
  starting = false;
  // Read previous best BEFORE saving so comparison is against the real stored value
  const previousBest = getHighScore();
  const isNewHighScore = data.score > 0 && data.score > previousBest;
  if (isNewHighScore) saveHighScore(data.score);

  ui.goScore.textContent = data.score.toLocaleString();
  ui.goBest.textContent = (isNewHighScore ? data.score : previousBest).toLocaleString();
  ui.newBest.classList.toggle('hidden', !isNewHighScore);
  ui.goLevel.textContent = `Level ${data.level}`;
  ui.goDistance.textContent = data.distance;
  show(ui.gameover);
  ui.goTitle.classList.remove('pop');
  void ui.goTitle.offsetWidth;
  ui.goTitle.classList.add('pop');
}

$('startBtn').addEventListener('click', startRun);
$('retryBtn').addEventListener('click', startRun);
$('menuBtn').addEventListener('click', () => { if (!starting) showTitle(); });
$('pauseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); togglePause(); });
ui.pause.addEventListener('pointerdown', togglePause);

// ---------------------------------------------------------------- input

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (state === 'title' && (k === ' ' || k === 'enter')) startRun();
  else if (state === 'over' && k === ' ') startRun();
  else if (state === 'over' && k === 'escape') showTitle();
  else if ((state === 'playing' || state === 'paused') && (k === 'p' || k === 'escape')) togglePause();
  else if (state === 'playing') {
    if (k === 'arrowleft' || k === 'a') game.switchLane('left');
    if (k === 'arrowright' || k === 'd') game.switchLane('right');
  }
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
});

// Swipe: fire as soon as the threshold is crossed, no waiting for finger lift (same as 2D)
let swipeStartX = 0;
let swiping = false;
renderer.domElement.addEventListener('pointerdown', (e) => {
  swipeStartX = e.clientX;
  swiping = true;
});
window.addEventListener('pointermove', (e) => {
  if (!swiping || state !== 'playing') return;
  const dx = e.clientX - swipeStartX;
  if (Math.abs(dx) < CONSTANTS.SWIPE_THRESHOLD) return;
  swiping = false;
  game.switchLane(dx > 0 ? 'right' : 'left');
});
window.addEventListener('pointerup', () => { swiping = false; });

// ---------------------------------------------------------------- render loop

function resize(): void {
  const w = app.clientWidth;
  const h = app.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Widen the vertical FOV on narrow screens so Bolt stays in frame in the outer lanes
  const halfV = Math.atan(0.28 / camera.aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(halfV * 2), 50, 80);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const lookAt = new THREE.Vector3();
let lastFrame = performance.now();

function frame(now: number): void {
  requestAnimationFrame(frame);
  const delta = Math.min(now - lastFrame, 50); // avoid a huge jump after a background tab
  lastFrame = now;

  if (state === 'playing') {
    world.scroll(game.update(delta));
    ui.score.textContent = game.getScore().toLocaleString();
    ui.distance.textContent = game.getDistance();
  }
  if (state === 'title' || state === 'over') return; // full-screen art covers the scene

  // Chase camera eases toward Bolt's lane
  const px = game.getPlayerX();
  camera.position.set(CAM_POS.x + px * CAM_FOLLOW, CAM_POS.y, CAM_POS.z);
  if (now < shakeUntil) {
    camera.position.x += (Math.random() - 0.5) * 0.25;
    camera.position.y += (Math.random() - 0.5) * 0.25;
  }
  lookAt.set(CAM_LOOK.x + px * CAM_FOLLOW, CAM_LOOK.y, CAM_LOOK.z);
  camera.lookAt(lookAt);
  world.followCamera(camera);
  renderer.render(world.scene, camera);
}

showTitle();
requestAnimationFrame(frame);

// Exposed for automated screenshot checks only
(window as unknown as { __bb3d: unknown }).__bb3d = { startRun, game, get state() { return state; } };
