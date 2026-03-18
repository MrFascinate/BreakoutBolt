const STORAGE_KEY = 'outrun-the-ops-highscore';

export function getHighScore(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): boolean {
  const current = getHighScore();
  if (score > current) {
    try {
      localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
      // localStorage unavailable
    }
    return true;
  }
  return false;
}
