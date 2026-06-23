import type { TimerState } from '../types';

export function timerRemaining(timer: TimerState): number {
  if (!timer.running || timer.startedAt === null) return timer.duration;
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  return Math.max(0, timer.duration - elapsed);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
