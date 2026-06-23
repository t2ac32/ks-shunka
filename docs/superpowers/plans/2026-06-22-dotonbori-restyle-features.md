# Dotonbori Restyle + Timer + EN VIVO + Player Draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Dotonbori visual theme, add a round countdown timer, an EN VIVO streaming banner, and a drag-and-drop player draft overlay on the TV screen.

**Architecture:** New state (`TimerState`, `StreamState`) is added to the `Tournament` type and Zustand store, then consumed by the Judge (timer controls), Setup (streaming URLs), and TV (timer display, EN VIVO button, ticker, draft overlay) screens. CSS theme tokens are replaced in `src/index.css`; all components inherit automatically via CSS variables.

**Tech Stack:** React 19 + Vite + TypeScript strict, Zustand + Immer, Vitest, inline styles throughout (no CSS modules/Tailwind).

## Global Constraints

- All inline styles — no CSS class-based styling except global `src/index.css` reset/tokens/keyframes
- TypeScript strict mode, no `any`
- Spanish UI text throughout
- No comments unless WHY is non-obvious
- Zustand store: every mutating action must call `persist()` at the end
- `persist()` must NOT mutate the `Tournament` object (Immer freezes it) — use `{ ...t, savedAt: Date.now() }` spread
- `localStorage` key: `shunka_v1`
- Google Fonts already loaded in `index.html`: Zen Kaku Gothic New + Shippori Mincho
- CSS font variable: `--serif: 'Shippori Mincho', serif` (defined in `src/index.css`)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/types.ts` | Modify | Add `TimerState`, `StreamState`, extend `Tournament` |
| `src/lib/timer.ts` | **Create** | `timerRemaining()`, `formatTimer()` pure helpers |
| `src/lib/timer.test.ts` | **Create** | Vitest tests for the two helpers |
| `src/store/tournament.ts` | Modify | `blankT()` defaults, 7 new actions, `loadSaved` hydration guard, remove shuffle from `startTournament` |
| `src/index.css` | Modify | Dotonbori palette in `:root`, 5 new `@keyframes` |
| `src/screens/Setup.tsx` | Modify | Add Instagram + YouTube URL inputs |
| `src/screens/Judge.tsx` | Modify | Add timer section (display + presets + start/stop/reset) |
| `src/screens/TV.tsx` | Modify | Round label sizes, timer in top bar, EN VIVO button, ticker banner, draft overlay |

---

## Task 1 — Data Layer: Types + Timer Helpers + Store Actions

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/timer.ts`
- Create: `src/lib/timer.test.ts`
- Modify: `src/store/tournament.ts`

**Interfaces — produces (used by Tasks 3, 4, 5):**
```ts
// src/lib/timer.ts
export function timerRemaining(timer: TimerState): number
export function formatTimer(seconds: number): string

// store actions (via useTournamentStore)
setTimerDuration(seconds: number): void
startTimer(): void
stopTimer(): void
resetTimer(): void
setLiveActive(active: boolean): void
setInstagramUrl(url: string): void
setYoutubeUrl(url: string): void
reorderPlayers(fromIdx: number, toIdx: number): void
// startTournament() — existing, modified: no more shuffle
```

- [ ] **Step 1: Extend `src/types.ts`**

Add after the existing `Tournament` type (after line 66):

```ts
export type TimerState = {
  duration: number;
  startedAt: number | null;
  running: boolean;
};

export type StreamState = {
  liveActive: boolean;
  instagramUrl: string;
  youtubeUrl: string;
};
```

Extend `Tournament` with two new fields — the full updated type:

```ts
export type Tournament = {
  id: string;
  name: string;
  theme: Theme;
  seedMode: 'random' | 'manual';
  status: 'setup' | 'running';
  players: Player[];
  bk: Bracket | null;
  savedAt: number;
  registrationCode?: string;
  timer: TimerState;
  stream: StreamState;
};
```

- [ ] **Step 2: Write failing tests in `src/lib/timer.test.ts`**

```ts
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
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/lib/timer.test.ts
```
Expected: FAIL — `timer.ts` does not exist yet.

- [ ] **Step 4: Create `src/lib/timer.ts`**

```ts
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
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/lib/timer.test.ts
```
Expected: 7 tests PASS.

- [ ] **Step 6: Update `src/store/tournament.ts`**

**6a. Update `blankT()`** — add `timer` and `stream` defaults:

```ts
function blankT(): Tournament {
  return {
    id: 't_' + Date.now().toString(36),
    name: 'Shunka Shūtō no Kessen',
    theme: 'lantern',
    seedMode: 'random',
    status: 'setup',
    players: [],
    bk: null,
    savedAt: Date.now(),
    timer: { duration: 1800, startedAt: null, running: false },
    stream: { liveActive: false, instagramUrl: '', youtubeUrl: '' },
  };
}
```

**6b. Update `loadSaved()`** — guard against old saves that lack the new fields:

```ts
function loadSaved(): Tournament {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return blankT();
    const saved = JSON.parse(raw) as Partial<Tournament>;
    const blank = blankT();
    return {
      ...blank,
      ...saved,
      timer: saved.timer ?? blank.timer,
      stream: saved.stream ?? blank.stream,
    };
  } catch {
    return blankT();
  }
}
```

**6c. Add to the `TournamentStore` type block:**

```ts
setTimerDuration(seconds: number): void;
startTimer(): void;
stopTimer(): void;
resetTimer(): void;
setLiveActive(active: boolean): void;
setInstagramUrl(url: string): void;
setYoutubeUrl(url: string): void;
reorderPlayers(fromIdx: number, toIdx: number): void;
```

**6d. Add the 8 new actions inside the `create(...)` call, after the existing actions:**

```ts
setTimerDuration(seconds: number) {
  set(s => {
    s.t.timer.duration = seconds;
    s.t.timer.startedAt = null;
    s.t.timer.running = false;
  });
  persist(get().t);
},

startTimer() {
  set(s => {
    s.t.timer.startedAt = Date.now();
    s.t.timer.running = true;
  });
  persist(get().t);
},

stopTimer() {
  set(s => {
    s.t.timer.startedAt = null;
    s.t.timer.running = false;
  });
  persist(get().t);
},

resetTimer() {
  set(s => {
    s.t.timer.startedAt = null;
    s.t.timer.running = false;
  });
  persist(get().t);
},

setLiveActive(active: boolean) {
  set(s => { s.t.stream.liveActive = active; });
  persist(get().t);
},

setInstagramUrl(url: string) {
  set(s => { s.t.stream.instagramUrl = url; });
  persist(get().t);
},

setYoutubeUrl(url: string) {
  set(s => { s.t.stream.youtubeUrl = url; });
  persist(get().t);
},

reorderPlayers(fromIdx: number, toIdx: number) {
  set(s => {
    const players = [...s.t.players];
    const [moved] = players.splice(fromIdx, 1);
    players.splice(toIdx, 0, moved);
    s.t.players = players;
  });
  persist(get().t);
},
```

**6f. Remove shuffle from `startTournament()`** — the current code has a Fisher-Yates shuffle block inside `startTournament` guarded by `if (t.seedMode === 'random')`. Delete those lines. The draft defines the final order. Updated `startTournament`:

```ts
startTournament() {
  const { t } = get();
  if (t.players.length < 4) return;
  const bk = structuredClone(buildBracket(t.players));
  resolveBracket(bk);
  set(s => {
    s.t.bk = bk;
    s.t.status = 'running';
  });
  persist(get().t);
},
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 8: Full test suite**

```bash
npx vitest run
```
Expected: 20 tests pass (13 engine + 7 timer).

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/lib/timer.ts src/lib/timer.test.ts src/store/tournament.ts
git commit -m "feat: TimerState, StreamState, timer helpers, 8 new store actions"
```

---

## Task 2 — Dotonbori CSS Theme

**Files:**
- Modify: `src/index.css`

No automated tests — verify visually after `npm run dev`.

- [ ] **Step 1: Replace `:root` block in `src/index.css`**

Find the existing `:root { ... }` block and replace it entirely:

```css
:root {
  --bg:        #0d0500;
  --bg2:       #180a02;
  --panel:     #1f0e04;
  --panel2:    #2a1208;
  --line:      #4a1e08;
  --line2:     #6b2c0e;
  --ink:       #ffefd5;
  --dim:       #c4916a;
  --faint:     #7a4e32;
  --accent:    #ff2200;
  --accent2:   #ffd700;
  --accentInk: #0d0500;
  --good:      #39ff14;
  --bad:       #ff2d55;
  --serif:     'Shippori Mincho', serif;
}
```

- [ ] **Step 2: Add 5 new `@keyframes` after the existing `@keyframes pop` block**

```css
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 8px #ff220066, 0 0 24px #ff220033; }
  50%     { box-shadow: 0 0 16px #ff2200aa, 0 0 40px #ff220055; }
}

@keyframes gold-glow {
  0%,100% { text-shadow: 0 0 10px #ffd70088; }
  50%     { text-shadow: 0 0 20px #ffd700cc, 0 0 40px #ffd70066; }
}

@keyframes pulse-dot {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: .5; transform: scale(.75); }
}

@keyframes draft-float {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}

@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

- [ ] **Step 3: TypeScript check (CSS doesn't affect TS, but catches import errors)**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Visual spot-check**

```bash
npm run dev
```

Open `http://localhost:5174`. Verify:
- Background is very dark reddish-brown (not the previous dark brown `#14110f`)
- Header accent color is gold `#ffd700` (accent2) for kanji
- Active nav tab is red `#ff2200` (accent)
- Theme toggle still works (switching to seasons shows blue theme)

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: Dotonbori theme tokens and keyframes"
```

---

## Task 3 — Setup Streaming Inputs

**Files:**
- Modify: `src/screens/Setup.tsx`

**Interfaces — consumes from Task 1:**
- `store.setInstagramUrl(url: string)`
- `store.setYoutubeUrl(url: string)`
- `t.stream.instagramUrl: string`
- `t.stream.youtubeUrl: string`

- [ ] **Step 1: Add streaming section to `src/screens/Setup.tsx`**

In the config card section (Section 1), find the registration code block (the `{t.registrationCode && ...}` preview div and the "Cargar inscritos" button area). Add a new streaming block **after** the registration code block and before the "Cargar inscritos" button group:

```tsx
{/* Streaming */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dim)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
    Streaming
  </div>
  <input
    type="text"
    value={t.stream.instagramUrl}
    onChange={e => store.setInstagramUrl(e.target.value)}
    placeholder="Instagram: @kidsstop.tcg"
    style={{ ...inputStyle }}
  />
  <input
    type="text"
    value={t.stream.youtubeUrl}
    onChange={e => store.setYoutubeUrl(e.target.value)}
    placeholder="YouTube: youtube.com/@kidsstoptcg"
    style={{ ...inputStyle }}
  />
</div>
```

`inputStyle` is already defined in `Setup.tsx` — reuse it. If it's defined inline elsewhere, extract it first or duplicate the style object.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Visual check**

Run `npm run dev`, go to Inscripción. Verify the two new inputs appear below the registration code section, accept text, and persist on reload.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Setup.tsx
git commit -m "feat: Instagram and YouTube URL inputs in Setup"
```

---

## Task 4 — Judge Timer Section

**Files:**
- Modify: `src/screens/Judge.tsx`

**Interfaces — consumes from Task 1:**
- `t.timer: TimerState`
- `store.setTimerDuration(seconds: number)`
- `store.startTimer()`
- `store.stopTimer()`
- `store.resetTimer()`
- `timerRemaining(timer: TimerState): number` from `../lib/timer`
- `formatTimer(seconds: number): string` from `../lib/timer`

- [ ] **Step 1: Add imports to `src/screens/Judge.tsx`**

At the top of the file, add:

```ts
import { timerRemaining, formatTimer } from '../lib/timer';
```

- [ ] **Step 2: Add timer local state and interval**

Inside the `Judge` component function, after the existing `useState` declarations, add:

```tsx
const timer = useTournamentStore(s => s.t.timer);
const setTimerDuration = useTournamentStore(s => s.setTimerDuration);
const startTimer = useTournamentStore(s => s.startTimer);
const stopTimer = useTournamentStore(s => s.stopTimer);
const resetTimer = useTournamentStore(s => s.resetTimer);
const [remaining, setRemaining] = useState(() => timerRemaining(timer));

useEffect(() => {
  setRemaining(timerRemaining(timer));
  if (!timer.running) return;
  const id = setInterval(() => setRemaining(timerRemaining(timer)), 1000);
  return () => clearInterval(id);
}, [timer.running, timer.startedAt, timer.duration]);

const PRESETS = [
  { label: '30 min', seconds: 1800 },
  { label: '45 min', seconds: 2700 },
  { label: '50 min', seconds: 3000 },
  { label: '75 min', seconds: 4500 },
];
```

- [ ] **Step 3: Add timer UI block**

In the Judge JSX, add this block as the **first child** of the main container div (before View A / View B / View C rendering):

```tsx
{/* Timer section — always visible */}
<div style={{
  background: 'var(--panel)',
  borderRadius: 16,
  padding: '18px 20px',
  marginBottom: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}}>
  <div style={{
    fontFamily: 'var(--serif)',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--accent2)',
    letterSpacing: '.06em',
  }}>
    ⏱ Timer de Ronda
  </div>

  {/* Countdown display */}
  <div style={{ textAlign: 'center' }}>
    <div style={{
      fontFamily: 'var(--serif)',
      fontSize: 48,
      fontWeight: 800,
      color: remaining <= 120 ? 'var(--accent)' : 'var(--accent2)',
      letterSpacing: '.05em',
      lineHeight: 1,
    }}>
      {formatTimer(remaining)}
    </div>
    <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6, letterSpacing: '.06em' }}>
      {timer.running ? 'En curso' : 'Ronda no iniciada'}
    </div>
  </div>

  {/* Presets */}
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {PRESETS.map(({ label, seconds }) => (
      <button
        key={seconds}
        onClick={() => setTimerDuration(seconds)}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: `1px solid ${timer.duration === seconds ? 'color-mix(in srgb,var(--accent2) 50%,transparent)' : 'var(--line2)'}`,
          background: 'var(--panel2)',
          color: timer.duration === seconds ? 'var(--accent2)' : 'var(--dim)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    ))}
  </div>

  {/* Start / Stop + Reset */}
  <div style={{ display: 'flex', gap: 10 }}>
    <button
      onClick={() => timer.running ? stopTimer() : startTimer()}
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 12,
        border: 'none',
        background: 'var(--accent)',
        color: '#fff',
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: '.1em',
        cursor: 'pointer',
      }}
    >
      {timer.running ? '⏹ DETENER' : '▶ INICIAR RONDA'}
    </button>
    <button
      onClick={resetTimer}
      style={{
        padding: '14px 18px',
        borderRadius: 12,
        border: '1px solid var(--line2)',
        background: 'var(--panel2)',
        color: 'var(--faint)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      ↺
    </button>
  </div>
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Visual test**

Run `npm run dev`. Go to Juez. Verify:
- Timer shows `30:00` at rest
- Clicking a preset changes the display and highlights that button
- INICIAR RONDA starts the countdown (ticks down every second)
- DETENER stops it; ↺ resets to the current duration
- When ≤ 2:00 remaining, the display turns red

- [ ] **Step 6: Commit**

```bash
git add src/screens/Judge.tsx
git commit -m "feat: round timer section in Judge screen"
```

---

## Task 5 — TV Screen: Timer + EN VIVO + Ticker + Draft Overlay + Round Labels

**Files:**
- Modify: `src/screens/TV.tsx`

**Interfaces — consumes from Task 1:**
- `t.timer: TimerState`
- `t.stream: StreamState`
- `store.setLiveActive(active: boolean)`
- `store.reorderPlayers(fromIdx: number, toIdx: number)`
- `store.startTournament()`
- `timerRemaining(timer: TimerState): number` from `../lib/timer`
- `formatTimer(seconds: number): string` from `../lib/timer`

- [ ] **Step 1: Add imports to `src/screens/TV.tsx`**

```ts
import { timerRemaining, formatTimer } from '../lib/timer';
```

- [ ] **Step 2: Fix round label styles in `BracketSection`**

Find the round label `<div>` inside `BracketSection` (currently `fontSize: 10.5, color: 'var(--faint)'`). Change to:

```tsx
style={{
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: 8,
  height: 16,
}}
```

- [ ] **Step 3: Add timer state and interval inside `TV` component**

After the existing `const [scale, setScale] = useState(1);` line:

```tsx
const timer = useTournamentStore(s => s.t.timer);
const stream = useTournamentStore(s => s.t.stream);
const setLiveActive = useTournamentStore(s => s.setLiveActive);
const reorderPlayers = useTournamentStore(s => s.reorderPlayers);
const startTournament = useTournamentStore(s => s.startTournament);
const [remaining, setRemaining] = useState(() => timerRemaining(timer));
const [dragIdx, setDragIdx] = useState<number | null>(null);
const [dragOver, setDragOver] = useState<number | null>(null);

useEffect(() => {
  setRemaining(timerRemaining(timer));
  if (!timer.running) return;
  const id = setInterval(() => setRemaining(timerRemaining(timer)), 1000);
  return () => clearInterval(id);
}, [timer.running, timer.startedAt, timer.duration]);
```

- [ ] **Step 4: Replace the title row in the TV inner div**

Find the `{/* Title row */}` block (currently kanji + tournament name + legend on right). Replace it with:

```tsx
{/* Title row */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 10,
  padding: '0 6px',
}}>
  {/* Kanji + name */}
  <span style={{
    fontFamily: 'var(--serif)',
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: 5,
    background: 'linear-gradient(90deg,#b8860b,#ffd700,#ffe87c,#ffd700,#b8860b)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'shimmer 3s linear infinite',
  }}>
    春夏秋冬
  </span>
  <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 21, color: 'var(--ink)' }}>
    {t.name}
  </span>

  {/* Timer display — centered */}
  <div style={{
    marginLeft: 'auto',
    marginRight: 'auto',
    background: 'var(--panel)',
    border: '1px solid var(--line2)',
    borderRadius: 12,
    padding: '5px 16px',
    textAlign: 'center',
    minWidth: 110,
  }}>
    <div style={{ fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)' }}>
      ⏱ Tiempo
    </div>
    <div style={{
      fontFamily: 'var(--serif)',
      fontSize: 28,
      fontWeight: 800,
      letterSpacing: '.05em',
      lineHeight: 1,
      color: remaining <= 120 ? 'var(--accent)' : 'var(--accent2)',
      animation: remaining <= 120 ? 'glow-pulse 0.8s ease-in-out infinite' : 'gold-glow 2s ease-in-out infinite',
    }}>
      {formatTimer(remaining)}
    </div>
  </div>

  {/* Right: EN VIVO + legend */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
    <button
      onClick={() => setLiveActive(!stream.liveActive)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 14px',
        borderRadius: 24,
        border: 'none',
        cursor: 'pointer',
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        background: stream.liveActive ? 'var(--accent)' : 'var(--panel2)',
        color: stream.liveActive ? '#fff' : 'var(--faint)',
        animation: stream.liveActive ? 'glow-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {stream.liveActive && (
        <span style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: '#fff',
          display: 'inline-block',
          animation: 'pulse-dot 1s ease-in-out infinite',
        }} />
      )}
      EN VIVO
    </button>
    <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--dim)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', display: 'inline-block' }} />
        En juego
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--dim)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} />
        Ganador
      </span>
    </span>
  </div>
</div>
```

- [ ] **Step 5: Add ticker banner at the bottom of the inner div (before closing `</div>`)**

Add this block as the last child inside the 1850px inner div, after the bracket grid:

```tsx
{/* Streaming ticker — only when liveActive */}
{stream.liveActive && (
  <div style={{
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    background: 'var(--panel)',
    borderTop: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)',
    padding: '5px 0',
    marginTop: 8,
  }}>
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: 0, width: 60, zIndex: 1,
      background: 'linear-gradient(90deg,var(--panel),transparent)',
    }} />
    <div style={{
      position: 'absolute', top: 0, bottom: 0, right: 0, width: 60, zIndex: 1,
      background: 'linear-gradient(-90deg,var(--panel),transparent)',
    }} />
    <div style={{ display: 'inline-block', animation: 'ticker 22s linear infinite' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 28, fontSize: 12, color: 'var(--dim)', paddingRight: 80 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 900, letterSpacing: '.1em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out infinite' }} />
          EN VIVO
        </span>
        <span style={{ color: 'var(--line2)' }}>·</span>
        <span>{t.name}</span>
        {stream.instagramUrl && <>
          <span style={{ color: 'var(--line2)' }}>·</span>
          <span>📸 <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{stream.instagramUrl}</span></span>
        </>}
        {stream.youtubeUrl && <>
          <span style={{ color: 'var(--line2)' }}>·</span>
          <span>▶ <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{stream.youtubeUrl}</span></span>
        </>}
        {/* repeat for continuous scroll */}
        <span style={{ color: 'var(--line2)', marginLeft: 60 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 900, letterSpacing: '.1em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out infinite' }} />
          EN VIVO
        </span>
        <span style={{ color: 'var(--line2)' }}>·</span>
        <span>{t.name}</span>
        {stream.instagramUrl && <>
          <span style={{ color: 'var(--line2)' }}>·</span>
          <span>📸 <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{stream.instagramUrl}</span></span>
        </>}
        {stream.youtubeUrl && <>
          <span style={{ color: 'var(--line2)' }}>·</span>
          <span>▶ <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{stream.youtubeUrl}</span></span>
        </>}
      </span>
    </div>
  </div>
)}
```

Note: The `ticker` keyframe was added in Task 2. `translateX(-50%)` works because the ticker content is duplicated inside the element, making the total width ~2× the visible width. The -50% shift moves exactly one copy out of view, at which point the animation loops seamlessly.

- [ ] **Step 6: Add draft overlay**

Add this block inside the TV `return`, **before** the `{t.status !== 'running' || !bk ? (not-started view) : (bracket view)}` conditional — as the first child of the outer wrapper div:

```tsx
{/* Draft overlay — shown before tournament starts when players exist */}
{t.status === 'setup' && t.players.length >= 2 && (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'var(--bg)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 40,
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--serif)',
        fontSize: 22,
        fontWeight: 800,
        background: 'linear-gradient(90deg,#b8860b,#ffd700,#ffe87c,#ffd700,#b8860b)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmer 3s linear infinite',
        marginBottom: 8,
      }}>
        春夏秋冬 · {t.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
        Selección de posición en el bracket · Arrastra para reordenar
      </div>
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      width: '100%',
      maxWidth: 720,
    }}>
      {t.players.map((p, i) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={e => { e.preventDefault(); setDragOver(i); }}
          onDrop={() => {
            if (dragIdx !== null && dragIdx !== i) reorderPlayers(dragIdx, i);
            setDragIdx(null);
            setDragOver(null);
          }}
          onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
          style={{
            background: 'var(--panel)',
            border: `1px solid ${dragOver === i ? 'var(--accent2)' : 'var(--line2)'}`,
            borderRadius: 14,
            padding: '16px 12px',
            textAlign: 'center',
            cursor: 'grab',
            opacity: dragIdx === i ? 0.4 : 1,
            boxShadow: dragOver === i ? '0 0 14px color-mix(in srgb,var(--accent2) 40%,transparent)' : 'none',
            animation: `draft-float ${2.5 + (i % 4) * 0.4}s ease-in-out infinite`,
            transition: 'border-color .15s, box-shadow .15s',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Seed {i + 1}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
            {p.name}
          </div>
        </div>
      ))}
    </div>

    <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.06em' }}>
      Se bloquea al iniciar la primera ronda
    </div>

    {t.players.length >= 4 && (
      <button
        onClick={startTournament}
        style={{
          padding: '14px 36px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: '.1em',
          cursor: 'pointer',
          boxShadow: '0 0 20px color-mix(in srgb,var(--accent) 50%,transparent)',
        }}
      >
        INICIAR TORNEO →
      </button>
    )}
  </div>
)}
```

The outer wrapper div needs `position: relative` for the absolute draft overlay to work. It should already have it from the auto-scaling implementation. If not, add it.

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 8: Full test suite**

```bash
npx vitest run
```
Expected: 20 tests pass.

- [ ] **Step 9: Visual verification**

Run `npm run dev`. Check TV tab:

1. **Draft overlay**: Start from a fresh wipe, add 4+ players in Setup, go to TV tab → draft overlay shows with floating cards. Drag one card to a new slot → order changes. Click INICIAR TORNEO → overlay disappears, bracket renders.
2. **Timer**: Start timer in Juez tab, switch to TV → countdown ticks. Let it drop to ≤2:00 → turns red with glow.
3. **EN VIVO**: Click EN VIVO button on TV → turns red/pulsing. Click again → goes back to gray.
4. **Ticker**: Set Instagram + YouTube in Setup. Click EN VIVO on TV → ticker banner appears at bottom scrolling with both links.
5. **Round labels**: Start an 8-player tournament, check TV bracket → round labels are larger and brighter than before.

- [ ] **Step 10: Commit**

```bash
git add src/screens/TV.tsx src/index.css
git commit -m "feat: TV timer display, EN VIVO button, ticker banner, player draft overlay"
```

---

## Post-implementation

- [ ] **Push to GitHub + Vercel auto-deploy**

```bash
git push origin main
```

Vercel deploys automatically. Verify at your Vercel URL that all 5 features work in production.
