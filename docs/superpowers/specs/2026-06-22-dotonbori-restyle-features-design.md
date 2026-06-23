# Diseño: Restyle Dotonbori + Timer + EN VIVO + Player Draft

**Fecha:** 2026-06-22  
**Estado:** Aprobado por el usuario

---

## Resumen

Cuatro cambios al sistema existente (React + Vite + TS, Zustand, Supabase, Vercel):

1. **Restyle visual Dotonbori** — nuevo tema "pachinko premium": negro rojizo, dorado shimmer, rojo lacado neon. Reemplaza el tema "lantern".
2. **Timer de ronda** — contador regresivo configurable desde Juez, visible en TV.
3. **EN VIVO + banner de streaming** — botón pulsante en TV, ticker con links de Instagram/YouTube.
4. **Player draft en TV** — tarjetas arrastrables para definir el seeding antes de iniciar.

---

## 1. Restyle Visual — Tema Dotonbori

### Paleta (reemplaza `lantern` en `src/index.css`)

| Token | Hex | Descripción |
|---|---|---|
| `--bg` | `#0d0500` | Negro rojizo profundo |
| `--bg2` | `#180a02` | — |
| `--panel` | `#1f0e04` | — |
| `--panel2` | `#2a1208` | — |
| `--line` | `#4a1e08` | — |
| `--line2` | `#6b2c0e` | — |
| `--ink` | `#ffefd5` | Blanco cálido |
| `--dim` | `#c4916a` | Cobre apagado |
| `--faint` | `#7a4e32` | Marrón oscuro |
| `--accent` | `#ff2200` | Rojo lacado |
| `--accent2` | `#ffd700` | Dorado |
| `--accentInk` | `#0d0500` | Texto sobre accent |
| `--good` | `#39ff14` | Verde neon |
| `--bad` | `#ff2d55` | Rosa neon |

El tema `seasons` se mantiene sin cambios. El toggle del header sigue funcionando igual (lantern ↔ seasons, ahora dotonbori ↔ seasons).

### Nuevos keyframes en `src/index.css`

```css
@keyframes shimmer {
  /* gold gradient sweep — usado en kanji del header y título TV */
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@keyframes glow-pulse {
  /* red neon breathe — bordes de matches en vivo, botón EN VIVO */
  0%,100% { box-shadow: 0 0 8px #ff220066, 0 0 24px #ff220033; }
  50%     { box-shadow: 0 0 16px #ff2200aa, 0 0 40px #ff220055; }
}

@keyframes gold-glow {
  /* gold text breathe — timer en TV, campeón */
  0%,100% { text-shadow: 0 0 10px #ffd70088; }
  50%     { text-shadow: 0 0 20px #ffd700cc, 0 0 40px #ffd70066; }
}

@keyframes pulse-dot {
  /* live dot — punto EN VIVO y ticker */
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: .5; transform: scale(.75); }
}
```

### Ajuste en TV — round labels

`src/screens/TV.tsx`: las etiquetas de ronda (`Ronda 1`, `Semifinal`, `Final WB`, `Ronda LB 1`…) pasan de `9px/normal/#7a4e32` a `12px/700/#c4916a`.

No se necesitan otros cambios de layout — todos los componentes heredan colores via CSS variables.

---

## 2. Round Timer

### Estado nuevo en `src/types.ts`

```ts
type TimerState = {
  duration: number;      // segundos totales (default 1800 = 30 min)
  startedAt: number | null;  // Date.now() al iniciar, null si no corre
  running: boolean;
};
```

Agregado a `Tournament`:
```ts
type Tournament = {
  // ... campos existentes ...
  timer: TimerState;
};
```

`blankT()` en el store inicializa `timer: { duration: 1800, startedAt: null, running: false }`.

### Acciones nuevas en el store (`src/store/tournament.ts`)

- `setTimerDuration(seconds: number)` — cambia duración, resetea si estaba corriendo
- `startTimer()` — `startedAt = Date.now()`, `running = true`
- `stopTimer()` — `startedAt = null`, `running = false`
- `resetTimer()` — `startedAt = null`, `running = false`, duración sin cambio

Todas llaman `persist()`.

### Cómputo del tiempo restante (función helper)

```ts
// src/store/tournament.ts o src/lib/timer.ts
export function timerRemaining(timer: TimerState): number {
  // retorna segundos restantes, mínimo 0
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

### Juez — nueva sección en `src/screens/Judge.tsx`

Aparece siempre (arriba del todo, antes de la lista de partidas). Contenido:

- **Display MM:SS** — grande, serif, color `--accent2`. Actualizado con `setInterval(1000)` en `useEffect`.
- **Presets**: 4 botones — `30 min` `45 min` `50 min` `75 min`. El activo resalta en dorado. Clic → `setTimerDuration(n * 60)`.
- **INICIAR RONDA / DETENER** — botón grande rojo. Texto alterna según `timer.running`. Clic → `startTimer()` o `stopTimer()`.
- **↺ Reset** — botón secundario. Clic → `resetTimer()`.

### TV — display en top bar (`src/screens/TV.tsx`)

En la barra superior (donde ya están kanji + nombre + leyenda), se agrega un recuadro central:

```
┌─────────────┐
│ ⏱ TIEMPO    │
│   27:34     │  ← serif, 30px, gold-glow animation
└─────────────┘
```

- Cuando `remaining <= 120` (≤ 2 min): color cambia a `--accent` (rojo) + `glow-pulse` animation.
- Cuando `remaining === 0`: muestra `00:00` estático en rojo.
- `setInterval` de 1 segundo en `useEffect`, cleanup en return.

---

## 3. EN VIVO + Banner de Streaming

### Estado nuevo en `src/types.ts`

```ts
type StreamState = {
  liveActive: boolean;
  instagramUrl: string;
  youtubeUrl: string;
};
```

Agregado a `Tournament`:
```ts
type Tournament = {
  // ...
  stream: StreamState;
};
```

`blankT()` inicializa `stream: { liveActive: false, instagramUrl: '', youtubeUrl: '' }`.

### Acciones en el store

- `setLiveActive(active: boolean)`
- `setInstagramUrl(url: string)`
- `setYoutubeUrl(url: string)`

### Setup — nuevos campos en `src/screens/Setup.tsx`

En la sección de configuración, debajo del código de torneo, se agrega un bloque "Streaming":

- Input: `Instagram URL` (placeholder: `@kidsstop.tcg`)
- Input: `YouTube URL` (placeholder: `youtube.com/@kidsstoptcg`)

Ambos llaman sus respectivas acciones del store on change.

### TV — botón EN VIVO y banner (`src/screens/TV.tsx`)

**Botón EN VIVO** — en la esquina superior derecha del top bar:
- Siempre visible en la pantalla TV.
- Cuando `stream.liveActive = false`: botón gris/dim, texto "EN VIVO" sin animación.
- Cuando `stream.liveActive = true`: botón rojo pulsante (`glow-pulse`), punto animado (`pulse-dot`), texto "● EN VIVO".
- Clic → `store.setLiveActive(!stream.liveActive)`.

**Ticker banner** — franja horizontal en el borde inferior de TV, solo visible cuando `stream.liveActive = true`:

```
[fade] ● EN VIVO · Shunka Shūtō no Kessen · 📸 @kidsstop.tcg · ▶ youtube... [fade]
```

- Animación `ticker`: `translateX(100%) → translateX(-100%)`, `20s linear infinite`.
- Si `instagramUrl` está vacío, no se muestra la sección de Instagram (y viceversa para YouTube).
- Fades laterales con `::before`/`::after` gradient overlays.

---

## 4. Player Draft en TV

### Comportamiento

La pantalla TV muestra una **overlay de pantalla completa** cuando `t.status === 'setup' && t.players.length >= 2`. La overlay desaparece en cuanto el torneo inicia (`status === 'running'`) y no vuelve hasta que se haga "Reiniciar todo".

### UI

- Fondo: `#0d0500` (mismo que bg), con el título del torneo en dorado shimmer.
- Grid 4 columnas de tarjetas (una por jugador, hasta 8).
- Cada tarjeta: seed number + nombre del jugador. Animación `draft-float` (levitación suave, delays escalonados).
- Drag & drop con HTML5 API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
- El drop reordena `t.players` en el store llamando una nueva acción: `reorderPlayers(fromIdx: number, toIdx: number)`.
- **"INICIAR TORNEO →"** — botón rojo al pie de la overlay. Llama `store.startTournament()`.
- **Estado drag visual**: tarjeta arrastrada se opaca (`opacity: 0.4`), el slot destino muestra borde dorado.

### Acción nueva en el store

```ts
reorderPlayers(fromIdx: number, toIdx: number): void
// intercambia t.players[fromIdx] con t.players[toIdx] y llama persist()
```

### Relación con seedMode

Si `seedMode === 'random'`, el botón "Barajar 🎲" en Setup mezcla el array antes de que el juez vea el draft. El draft es la última oportunidad de ajustar el orden antes de iniciar. `startTournament()` ya no hace shuffle aunque `seedMode === 'random'` (el shuffle ocurrió en Setup o quedó como está en el draft).

**Cambio en `startTournament()`**: eliminar el shuffle interno — el orden del draft ES el seeding final.

---

## Archivos afectados

| Archivo | Cambios |
|---|---|
| `src/index.css` | Nueva paleta dotonbori en `:root`, 4 nuevos keyframes |
| `src/types.ts` | Añadir `TimerState`, `StreamState` a `Tournament` |
| `src/store/tournament.ts` | `blankT()` init, 7 acciones nuevas, `startTournament` sin shuffle |
| `src/screens/Setup.tsx` | 2 inputs de streaming |
| `src/screens/Judge.tsx` | Sección timer (display + presets + start/stop/reset) |
| `src/screens/TV.tsx` | Timer en top bar, botón EN VIVO, ticker banner, draft overlay |
| `src/lib/timer.ts` | Nuevo archivo: `timerRemaining()` + `formatTimer()` |

---

## Fuera de alcance

- Sincronización del timer entre dispositivos distintos (requeriría Supabase Realtime). El timer se sincroniza dentro del mismo browser session via localStorage.
- Logo de marca (excluido explícitamente por el usuario).
- Cambios en el Header, DeckPicker, MatchCard, Judge/Setup internals — solo heredan la paleta nueva via CSS variables.
