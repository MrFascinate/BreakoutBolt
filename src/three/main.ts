import * as THREE from 'three';
import { CONSTANTS } from '../config/Constants';
import { getHighScore, saveHighScore } from '../utils/HighScore';
import { Game3D, GameEvents } from './Game3D';
import { createCharacterEnemy, loadCharacterModels } from './CharacterModels';
import { buildCodedEnemy } from './Models';
import { sfx } from './Sfx';
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
  chargeFill: $('chargeFill'), powers: $('powers'), powerToast: $('powerToast'),
  hint: $('hint'), speedLines: $('speedLines'),
  muteBtns: [$('muteBtn'), $('muteBtnTitle')],
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
let baseFov = 70;
let fovKick = 0;
let shakeUntil = 0;
let shakeAmount = 0.25;
let slowMoUntil = 0;

let state: State = 'title';
let starting = false;

const HINT_KEY = 'breakout-bolt-hint-runs';
const POWER_TEXT = { shield: ['SHIELD!', '#59c8ff'], magnet: ['MAGNET!', '#ff6b6b'], battery: ['+1 LIFE', '#5dff8a'], overdrive: ['OVERDRIVE!', '#7fe6ff'] };

function shake(ms: number, amount: number): void {
  shakeUntil = performance.now() + ms;
  shakeAmount = amount;
}

const events: GameEvents = {
  livesChanged: (lives) => { ui.lives.textContent = '⚡ '.repeat(Math.max(lives, 0)).trim(); },
  levelChanged: (level) => {
    ui.level.textContent = `LEVEL ${level}`;
    sfx.setLevel(level);
    if (level > 1) {
      restartAnim(ui.levelUp, `LEVEL ${level}`);
      sfx.levelUp();
    }
  },
  nearMiss: () => {
    restartAnim(ui.toast, '+100 CLOSE CALL');
    sfx.nearMiss();
    slowMoUntil = performance.now() + 220; // brief slow-motion beat
  },
  hit: () => {
    restartAnim(ui.flash);
    shake(120, 0.3);
    sfx.hit();
  },
  gameOver: (result) => showGameOver(result),
  jump: () => sfx.jump(),
  slide: () => sfx.slide(),
  lane: () => sfx.lane(),
  collect: () => sfx.collect(),
  powerUp: (kind) => {
    const [text, color] = POWER_TEXT[kind];
    ui.powerToast.style.color = color;
    restartAnim(ui.powerToast, text);
    if (kind === 'overdrive') {
      sfx.overdrive();
      shake(250, 0.2);
    } else {
      sfx.powerUp();
    }
  },
  shieldPop: () => {
    sfx.shieldPop();
    shake(120, 0.2);
    restartAnim(ui.toast, 'SHIELD BLOCKED!');
  },
  knock: () => {
    sfx.knock();
    shake(90, 0.15);
  },
};

// Start stays disabled until the enemy models are in; if they fail to load,
// the game still works with the coded enemies.
let game!: Game3D;
const startBtn = $<HTMLButtonElement>('startBtn');
startBtn.disabled = true;
startBtn.textContent = 'LOADING…';
const ready = loadCharacterModels()
  .then(() => { game = new Game3D(world.scene, events, createCharacterEnemy); })
  .catch((err) => {
    console.warn('Character models failed to load; using coded enemies.', err);
    game = new Game3D(world.scene, events, buildCodedEnemy);
  })
  .then(() => {
    startBtn.disabled = false;
    startBtn.textContent = 'START';
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

function refreshMuteIcons(): void {
  for (const b of ui.muteBtns) b.textContent = sfx.isMuted() ? '\u{1F507}' : '\u{1F50A}';
}

// ---------------------------------------------------------------- screens

function showTitle(): void {
  state = 'title';
  starting = false;
  sfx.stopMusic();
  const best = getHighScore();
  ui.titleBest.textContent = best > 0 ? `High Score: ${best.toLocaleString()}` : '';
  ui.speedLines.style.opacity = '0';
  show(ui.title);
}

function startRun(): void {
  if (starting || !game) return;
  starting = true;
  sfx.unlock();
  sfx.startMusic(1);
  game.reset();
  ui.score.textContent = '0';
  ui.distance.textContent = '0.00 mi';
  for (const el of [ui.toast, ui.levelUp, ui.flash, ui.powerToast, ui.hint]) el.classList.remove('show');
  lastCharge = -1;
  lastPowers = '';
  fovKick = 0;
  state = 'playing';
  show(ui.hud);
  showHint();
  lastFrame = performance.now();
}

/** Controls reminder for a player's first few runs. */
function showHint(): void {
  let runs = 0;
  try { runs = parseInt(localStorage.getItem(HINT_KEY) ?? '0', 10) || 0; } catch { /* storage unavailable */ }
  if (runs >= 3) return;
  try { localStorage.setItem(HINT_KEY, String(runs + 1)); } catch { /* storage unavailable */ }
  const touch = window.matchMedia('(pointer: coarse)').matches;
  restartAnim(ui.hint, touch ? 'SWIPE ↑ JUMP  •  ↓ SLIDE' : '↑ JUMP  •  ↓ SLIDE  •  ← → MOVE');
}

function togglePause(): void {
  if (state === 'playing' && !game.isOver()) {
    state = 'paused';
    sfx.suspend(true);
    show(ui.hud, ui.pause);
  } else if (state === 'paused') {
    state = 'playing';
    sfx.suspend(false);
    show(ui.hud);
  }
}

function showGameOver(data: { score: number; distance: string; level: number }): void {
  state = 'over';
  starting = false;
  sfx.stopMusic();
  sfx.gameOver();
  ui.speedLines.style.opacity = '0';
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

function toggleMute(): void {
  sfx.setMuted(!sfx.isMuted());
  refreshMuteIcons();
}

$('startBtn').addEventListener('click', startRun);
$('retryBtn').addEventListener('click', startRun);
$('menuBtn').addEventListener('click', () => { if (!starting) showTitle(); });
$('pauseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); togglePause(); });
for (const b of ui.muteBtns) {
  b.addEventListener('pointerdown', (e) => { e.stopPropagation(); sfx.unlock(); toggleMute(); });
}
ui.pause.addEventListener('pointerdown', togglePause);
refreshMuteIcons();

// ---------------------------------------------------------------- input

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'm') toggleMute();
  else if (state === 'title' && (k === ' ' || k === 'enter')) startRun();
  else if (state === 'over' && k === ' ') startRun();
  else if (state === 'over' && k === 'escape') showTitle();
  else if ((state === 'playing' || state === 'paused') && (k === 'p' || k === 'escape')) togglePause();
  else if (state === 'playing') {
    if (k === 'arrowleft' || k === 'a') game.switchLane('left');
    if (k === 'arrowright' || k === 'd') game.switchLane('right');
    if (k === 'arrowup' || k === 'w' || k === ' ') game.jump();
    if (k === 'arrowdown' || k === 's') game.slide();
  }
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
});

// Swipe: fire as soon as the threshold is crossed, no waiting for finger lift (same as 2D).
// The dominant axis decides between a lane change and a jump/slide.
let swipeStartX = 0;
let swipeStartY = 0;
let swiping = false;
renderer.domElement.addEventListener('pointerdown', (e) => {
  swipeStartX = e.clientX;
  swipeStartY = e.clientY;
  swiping = true;
});
window.addEventListener('pointermove', (e) => {
  if (!swiping || state !== 'playing') return;
  const dx = e.clientX - swipeStartX;
  const dy = e.clientY - swipeStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < CONSTANTS.SWIPE_THRESHOLD) return;
  swiping = false;
  if (Math.abs(dx) > Math.abs(dy)) game.switchLane(dx > 0 ? 'right' : 'left');
  else if (dy < 0) game.jump();
  else game.slide();
});
window.addEventListener('pointerup', () => { swiping = false; });

// ---------------------------------------------------------------- HUD

let lastCharge = -1;
let lastPowers = '';

function updateHud(): void {
  ui.score.textContent = game.getScore().toLocaleString();
  ui.distance.textContent = game.getDistance();

  const p = game.getPowerState();
  const overdrive = p.overdriveLeft > 0;
  const charge = Math.round(p.charge * 100);
  if (charge !== lastCharge) {
    ui.chargeFill.style.width = `${charge}%`;
    ui.chargeFill.classList.toggle('od', overdrive);
    lastCharge = charge;
  }

  const badges: string[] = [];
  if (overdrive) badges.push(`<span class="pw" style="border-color:#7fe6ff">\u{1F680} ${Math.ceil(p.overdriveLeft / 1000)}</span>`);
  if (p.shield) badges.push('<span class="pw" style="border-color:#59c8ff">\u{1F6E1}️</span>');
  if (p.magnetLeft > 0) badges.push(`<span class="pw" style="border-color:#ff6b6b">\u{1F9F2} ${Math.ceil(p.magnetLeft / 1000)}</span>`);
  const html = badges.join('');
  if (html !== lastPowers) {
    ui.powers.innerHTML = html;
    lastPowers = html;
  }
}

// ---------------------------------------------------------------- render loop

function resize(): void {
  const w = app.clientWidth;
  const h = app.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Widen the vertical FOV on narrow screens so Bolt stays in frame in the outer lanes
  const halfV = Math.atan(0.28 / camera.aspect);
  baseFov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(halfV * 2), 50, 80);
  camera.fov = baseFov + fovKick;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const lookAt = new THREE.Vector3();
let lastFrame = performance.now();

function frame(now: number): void {
  requestAnimationFrame(frame);
  let delta = Math.min(now - lastFrame, 50); // avoid a huge jump after a background tab
  lastFrame = now;

  if (state === 'playing') {
    if (now < slowMoUntil) delta *= 0.3;
    world.scroll(game.update(delta));
    updateHud();
  }
  if (state === 'title' || state === 'over') return; // full-screen art covers the scene

  // Speed feel: widen the FOV and show speed lines as the run gets faster
  const overdrive = game.isOverdrive();
  const speedRatio = game.getSpeedRatio();
  const kickTarget = overdrive ? 10 : speedRatio * 4;
  fovKick += (kickTarget - fovKick) * Math.min(1, delta / 250);
  camera.fov = baseFov + fovKick;
  camera.updateProjectionMatrix();
  ui.speedLines.style.opacity = state === 'playing' ? String(overdrive ? 0.9 : Math.max(0, speedRatio - 0.35) * 0.6) : '0';
  ui.speedLines.classList.toggle('od', overdrive);

  // Chase camera eases toward Bolt's lane and rises a little with his jumps
  const px = game.getPlayerX();
  const py = game.getPlayerY();
  camera.position.set(CAM_POS.x + px * CAM_FOLLOW, CAM_POS.y + py * 0.35, CAM_POS.z);
  if (now < shakeUntil) {
    camera.position.x += (Math.random() - 0.5) * shakeAmount;
    camera.position.y += (Math.random() - 0.5) * shakeAmount;
  }
  lookAt.set(CAM_LOOK.x + px * CAM_FOLLOW, CAM_LOOK.y + py * 0.2, CAM_LOOK.z);
  camera.lookAt(lookAt);
  world.followCamera(camera);
  renderer.render(world.scene, camera);
}

showTitle();
requestAnimationFrame(frame);

// Exposed for automated screenshot checks only
(window as unknown as { __bb3d: unknown }).__bb3d = { startRun, ready, get game() { return game; }, get state() { return state; } };
