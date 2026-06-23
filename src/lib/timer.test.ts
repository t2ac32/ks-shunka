import { describe, test, expect, vi } from 'vitest';
import { timerRemaining, formatTimer } from './timer';
import type { TimerState } from '../types';

describe('formatTimer', () => {
  test('formats zero', () => expect(formatTimer(0)).toBe('00:00'));
  test('formats 90 seconds', () => expect(formatTimer(90)).toBe('01:30'));
  test('formats 1800 seconds', () => expect(formatTimer(1800)).toBe('30:00'));
  test('formats 4500 seconds', () => expect(formatTimer(4500)).toBe('75:00'));
});

describe('timerRemaining', () => {
  const stopped: TimerState = { duration: 1800, startedAt: null, running: false };
  const running = (elapsed: number): TimerState => ({
    duration: 1800,
    startedAt: Date.now() - elapsed * 1000,
    running: true,
  });

  test('returns duration when not running', () => {
    expect(timerRemaining(stopped)).toBe(1800);
  });

  test('returns remaining when running', () => {
    vi.useFakeTimers();
    const t = running(60);
    expect(timerRemaining(t)).toBe(1740);
    vi.useRealTimers();
  });

  test('clamps at zero when elapsed > duration', () => {
    vi.useFakeTimers();
    const t = running(2000);
    expect(timerRemaining(t)).toBe(0);
    vi.useRealTimers();
  });
});
