# Handoff: Web App de Torneo a Doble Eliminación — "Shunka Shūtō no Kessen"

## Overview
App de gestión de un torneo de **Pokémon TCG a doble eliminación** (Winner Bracket + Loser Bracket; un jugador queda fuera al perder 2 rondas). Organizada por *Kids Stop*, una tienda/club de TCG estilo izakaya en México. Interfaz en **español**, estética japonesa.

La app tiene **3 pantallas** en una sola interfaz con navegación por pestañas:
1. **Inscripción** — alta de jugadores y selección de hasta 4 mazos por jugador (responsiva, móvil).
2. **Juez** — registro de resultados: baneo de mazos + Best-of-3 (responsiva, móvil).
3. **Torneo · TV** — visualización del bracket completo, pensada para proyectar en una TV (horizontal).

## About the Design Files
El archivo `Torneo Shunka Shuto.dc.html` es una **referencia de diseño creada en HTML** — un prototipo funcional que muestra el look y el comportamiento deseados. **No es código de producción para copiar directamente.**

El archivo usa un runtime propietario interno ("DC" / Design Component: `<x-dc>`, `<sc-if>`, `<sc-for>`, `{{ holes }}`, `support.js`). **No reutilices ese runtime.** La tarea es **recrear este diseño en un entorno de producción real** (recomendado: **React + Vite + TypeScript**, o el stack que el equipo prefiera), usando sus patrones y librerías. Toda la lógica del torneo (que es la parte valiosa y ya está probada) está en JS plano dentro de la clase `Component` del `<script>` y es directamente portable.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciados, estados e interacciones son finales. Recrear la UI fielmente. Los estilos están inline en el HTML; abajo se documentan los tokens para trasladarlos a CSS variables / tema.

---

## Arquitectura recomendada

```
src/
  engine/
    bracket.ts        // motor puro: buildBracket, resolveBracket, setResult, champion, helpers
    bracket.test.ts   // tests (ya validado: ver "Pruebas del motor")
  store/
    tournament.ts     // estado + persistencia (localStorage + export/import JSON)
  data/
    archetypes.ts     // lista de arquetipos (id, nombre, color)
  screens/
    Setup.tsx         // Inscripción
    Judge.tsx         // Juez (lista + detalle de partida)
    TV.tsx            // Bracket proyectable
  components/
    Header.tsx, MatchCard.tsx, DeckDot.tsx, ...
  theme.ts            // tokens (los dos temas)
```

Mantén el **motor de bracket separado de la UI** y cúbrelo con tests — es el corazón del producto.

---

## Modelo de datos

```ts
type DeckRef = { id: string } | { custom: true; name: string } | null;

type Player = {
  id: string;
  name: string;
  decks: [DeckRef, DeckRef, DeckRef, DeckRef]; // hasta 4
};

type MatchSource = { type: 'winner' | 'loser' | 'loserGF'; match: string };

type Game = {
  d1: number;        // índice (0–3) del mazo que usó p1
  d2: number;        // índice del mazo que usó p2
  winner: 'p1' | 'p2';
};

type Match = {
  id: string;        // 'WB-1-0', 'LB-2-1', 'GF-1', 'GF-2'
  bracket: 'WB' | 'LB' | 'GF';
  round: number;
  slot: number;
  p1: string | 'BYE' | null;   // playerId; null = aún por definir
  p2: string | 'BYE' | null;
  src1?: MatchSource;          // de dónde llega p1 (si no es ronda 1)
  src2?: MatchSource;
  winner: string | 'BYE' | null;
  loser: string | 'BYE' | null;
  status: 'pending' | 'banning' | 'playing' | 'done';
  ban: { for1: number | null; for2: number | null }; // índice del mazo de p1 baneado por p2, y viceversa
  games: Game[];
  auto: boolean;     // true si se resolvió por BYE (no contar como partida jugada)
  winnerSide?: 'wb' | 'lb';  // solo GF
  needed?: boolean;  // solo GF-2: ¿hace falta el reset?
  hidden?: boolean;  // GF-2 arranca oculto
};

type Tournament = {
  id: string;
  name: string;
  theme: 'lantern' | 'seasons';
  seedMode: 'random' | 'manual';
  status: 'setup' | 'running';
  players: Player[];
  bk: Bracket | null;          // { matches: Record<string,Match>, wb: string[][], lb: string[][], gf: string[], S, R, N }
  savedAt: number;
};
```

---

## Reglas del torneo (LÓGICA CRÍTICA — copiar con cuidado)

### Formato general
- **Doble eliminación**: cada jugador tiene que perder **2 rondas** para quedar fuera. Hay Winner Bracket (WB), Loser Bracket (LB) y Gran Final.
- Mínimo 4 jugadores. El sistema dimensiona el bracket a la siguiente potencia de 2 (`S = nextPow2(N)`) y rellena los huecos con **BYE**. Los BYE se resuelven automáticamente (el rival avanza sin jugar; `auto: true`, no cuenta como partida).
- **Sembrado**: `random` (baraja al iniciar) o `manual` (respeta el orden de la lista). El emparejamiento de la ronda 1 usa el orden de sembrado estándar (1 vs S, 2 vs S-1, etc. — ver `seedOrder`).

### Gran Final + reset
- A GF-1 llega el ganador de WB (p1) contra el ganador de LB (p2).
- Si gana el lado de WB → **campeón directo**.
- Si gana el lado de LB → como WB pierde su primera derrota, se juega **GF-2 (reset)**: el ganador de ese es el campeón. (`GF-2.needed` se activa solo cuando el lado LB gana GF-1.)

### Cada ronda (enfrentamiento entre 2 jugadores)
Una ronda pasa por estos `status`:
1. `pending` → cuando ambos jugadores están definidos pasa a `banning`.
2. **`banning` (fase de baneo)**: cada jugador prohíbe **1 mazo** del rival, de los 4. Quedan **3 mazos por jugador** para jugar. La UI exige un baneo por cada lado antes de continuar (`ban.for1` y `ban.for2` no nulos). Al confirmar → `playing`.
3. **`playing` (Best-of-3, modo "Conquista")**:
   - Cada sub-partida se juega con **un mazo distinto** de cada jugador.
   - **Regla conquest**: el mazo con el que **ganas** una sub-partida queda **retirado** (no lo puedes volver a usar en esa ronda). El que pierde **sí** puede repetir mazo.
   - Por tanto, en cada juego los mazos disponibles de un jugador = sus 4 mazos − el baneado − los que ya le dieron una victoria. (ver `availDecks`).
   - El primero en ganar **2 sub-partidas** gana la ronda → `done`.
4. **`done`**: ganador avanza en su bracket; perdedor cae al LB (o queda eliminado si ya estaba en LB).

### Deshacer
- Se puede borrar un juego registrado. Si eso deja la ronda por debajo de 2 victorias y estaba `done`, la ronda se reabre y **se limpian en cascada** todas las rondas posteriores que dependían de ese resultado (`resetDownstream`): se vacían sus jugadores, resultados, baneos y juegos.

### Pruebas del motor (ya validadas en este proyecto)
Para N = 4, 6, 8, 12, 16 se simuló un torneo completo. Conteo de partidas reales jugadas ≈ `2N−2` a `2N−1` (correcto para doble eliminación con reset). Los BYE se auto-resuelven; los perdedores enrutan correctamente al LB. **Replicar estos tests en el port.**

---

## Pantallas / Views

### 1. Inscripción (`data-screen-label="Inscripción"`)
**Propósito:** configurar el torneo y capturar jugadores + mazos. Responsiva, optimizada para móvil. Contenedor centrado, `max-width: 780px`.

**Sección "Configuración"** (card `--panel`, radio 16px, padding 18px):
- Input de **nombre del torneo** (alto 44px).
- Select **Sembrado**: Aleatorio / Manual (orden de lista). Botón **"Barajar 🎲"**.
- Línea de estado: `N jugadores · M listos` (un jugador está "listo" con 4 mazos). El número grande usa la fuente serif.
- Botón primario **"Iniciar torneo →"** (fondo `--accent2`, texto oscuro). Si el torneo ya corre, cambia a "Reiniciar bracket" + botón "Editar lista". Bloquea si <4 jugadores; advierte (confirm) si alguien no tiene 4 mazos.
- Fila de utilidades: **⬇ Exportar respaldo**, **⬆ Importar** (file input oculto), **Reiniciar todo**, y **🧪 Torneo de prueba** (botón con borde punteado `--accent2`, alineado a la derecha; solo en modo edición — genera 12 jugadores con nombres japoneses y 4 mazos aleatorios distintos).

**Sección "Jugadores y mazos"** (solo en modo edición):
- Input "Nombre del jugador" + botón **"Añadir"** (Enter también añade).
- Por jugador, una card (`--bg2`, radio 13px). El borde se tiñe de verde (`--good`) cuando el jugador tiene sus 4 mazos. Contiene:
  - Chip con número de seed (26×26, radio 7px).
  - Input editable del nombre (peso 700).
  - Badge "X/4" (verde si 4/4, gris si no).
  - Botón ✕ para eliminar (32×32).
  - Grid de **4 selectores de mazo** (`repeat(auto-fit, minmax(150px, 1fr))`, gap 8px). Cada uno: un **disco de color** (22px, círculo) del arquetipo + un `<select>` con la lista de arquetipos y la opción "✎ Personalizado…" (abre prompt para nombre libre).

### 2. Juez (`data-screen-label="Juez"`)
**Propósito:** el juez registra resultados. Responsiva móvil. `max-width: 560px`.

Tres estados:

**a) No iniciado:** mensaje centrado "El torneo aún no ha comenzado".

**b) Lista de partidas:**
- Si hay campeón, banner dorado arriba: "Campeón 優勝 · 🏆 {nombre}".
- Encabezado "Partidas por jugar" + contador "N activas".
- Lista de **partidas activas** (status `banning` o `playing`, ambos jugadores reales). Cada una es un botón-card a ancho completo:
  - Tag de ronda (p. ej. "Winners R1", "Losers · Final", "Gran Final") con color por bracket: WB → `--accent2`, LB → `--dim`, GF → `--accent`.
  - Etiqueta de fase: "Baneo pendiente" o "Bo3 en juego".
  - CTA a la derecha: "Registrar →" / "Continuar →".
  - Nombres p1 / marcador (s1 · s2) / p2. El marcador usa serif; el líder en `--accent2`.
  - Borde resaltado en `--accent` si está `playing`.
- `<details>` colapsable "Partidas terminadas (N)" con filas compactas y enlace "editar".

**c) Detalle de partida** (al abrir una):
- Botón "← Volver".
- **Scoreboard**: dos cajas (p1 / p2) con nombre y marcador grande serif (34px, `--accent2`). La caja del líder se tiñe; borde `--accent2` al llegar a 2.
- **Fase de baneo** (status `banning`): texto explicativo; dos grupos — "{p2} banea un mazo de {p1}" y "{p1} banea un mazo de {p2}". Cada mazo es un botón toggle; al banear se marca tachado en rojo (`--bad`) con etiqueta "BANEADO". Botón "Confirmar baneos y empezar Bo3 →" (deshabilitado hasta tener 1 baneo por lado).
- **Fase de juego** (status `playing`/`done`):
  - Lista de juegos ya registrados: "G1", mazo de p1 (disco+nombre), marcador acumulado, mazo de p2, botón ✕ para deshacer. El ganador del juego va en `--ink` peso 700; el perdedor en `--faint`.
  - Entrada del siguiente juego (card con borde punteado): "Juego N — mazo distinto al que ya ganó cada quien", dos selects (solo mazos disponibles según conquest), y dos botones "Gana {p1}" / "Gana {p2}" (activos al elegir ambos mazos).
  - Al cerrar (2 victorias): banner verde "Ganador de la ronda · {nombre}".

### 3. Torneo · TV (`data-screen-label="TV"`)
**Propósito:** proyección en TV horizontal del bracket completo de un vistazo. Ocupa `100vh − header`, sin scroll.

- **Auto-escalado**: el contenido se maqueta a un ancho natural fijo (`width: 1850px`) y se escala con `transform: scale()` para caber en el contenedor (lógica `measureTV`: calcula `min(wrapW/natW, wrapH/natH)`, clamp 0.25–1.9, recalcula en `resize` y al cambiar de pantalla). En el port, equivalente: medir contenedor vs contenido y aplicar scale; `transform-origin: top center`.
- **Fila de título**: kanji 春夏秋冬 (serif, `--accent2`) + nombre del torneo + leyenda ("En juego" = cuadro `--accent` con glow; "Ganador" = cuadro `--accent2`).
- **Layout**: grid de 2 columnas → izquierda (Winners arriba, Losers abajo, apiladas) y derecha (Campeón + Gran Final, centradas verticalmente).
  - **Winners Bracket** (título con barra `--accent2` + kanji 勝者): columnas por ronda, cada columna con su label ("Ronda 1", "Semifinal", "Final"); las cards se reparten con `justify-content: space-around`.
  - **Losers Bracket** (barra `--dim` + kanji 敗者): igual, columnas más juntas.
  - **MatchCard** (ancho 160px): dos filas (top/bottom) con nombre (elipsis) + score (serif). Estados:
    - *Por definir* / *BYE*: `--faint`, itálica.
    - *Ganador* (partida done): `--accent2`, peso 800.
    - *Perdedor* (done): `--faint`, tachado.
    - *En juego* (banning/playing): borde `--accent` + glow (box-shadow doble).
    - *Pendiente* (sin ambos jugadores): opacidad 0.45.
  - **Campeón**: card con degradado, "Campeón 優勝", 🏆, nombre serif 23px.
  - **Gran Final**: card con GF-1 (y GF-2 solo si `needed`).

### Header (común)
Sticky, blur. Izquierda: kanji 春夏秋冬 + título "Shunka Shūtō no Kessen" + subtítulo "Kids Stop · Torneo de las 4 Estaciones". Centro/derecha: nav de 3 pestañas (Inscripción / Juez / Torneo · TV) en un contenedor `--panel` con la activa en `--accent`. Botón de cambio de tema (Farol ⇄ 4 Estaciones).

---

## Persistencia (REQUISITO IMPORTANTE)
El torneo debe sobrevivir cortes de luz, recargas y cierres, y poder moverse entre dispositivos:
- **Autoguardado** en `localStorage` bajo la clave `shunka_v1` en cada cambio (`persist()` guarda el objeto `Tournament` completo, incl. `savedAt`). Al cargar, se rehidrata.
- **Exportar / Importar** el torneo como archivo **JSON** (todo el objeto `Tournament`, incl. el bracket en curso) para cambiar de dispositivo. Importar valida que el objeto tenga `players` y restaura la pantalla según `status`.
- En el port, considera además exportación periódica o sync opcional, pero el mínimo es localStorage + archivo JSON.

---

## Design Tokens

Dos temas (CSS variables en `:root` y `[data-theme="seasons"]`).

### Tema "Farol" (lantern, default) — izakaya nocturno cálido
| Token | Hex |
|---|---|
| `--bg` | `#14110f` |
| `--bg2` | `#1b1714` |
| `--panel` | `#201b17` |
| `--panel2` | `#28211b` |
| `--line` | `#3a2f27` |
| `--line2` | `#4a3c31` |
| `--ink` (texto) | `#f3ece2` |
| `--dim` | `#b3a596` |
| `--faint` | `#7d7065` |
| `--accent` (bermellón) | `#e0562d` |
| `--accent2` (ámbar) | `#f0a92b` |
| `--accentInk` | `#1a0f08` |
| `--good` | `#56b083` |
| `--bad` | `#d8584f` |

### Tema "4 Estaciones" (seasons) — azul nocturno + rosa/verde
| Token | Hex |
|---|---|
| `--bg` | `#0e1220` |
| `--bg2` | `#141a2c` |
| `--panel` | `#161c2e` |
| `--panel2` | `#1e253b` |
| `--line` | `#2b3450` |
| `--line2` | `#3a466a` |
| `--ink` | `#eef1fa` |
| `--dim` | `#9aa6c6` |
| `--faint` | `#6b769a` |
| `--accent` (rosa) | `#d96a8f` |
| `--accent2` (verde) | `#5fb6a8` |
| `--accentInk` | `#0b0f1a` |
| `--good` | `#5fb6a8` |
| `--bad` | `#e0708a` |

> Nota: se usa `color-mix(in srgb, …)` para fondos translúcidos y mezclas. Es CSS moderno; replicable tal cual o con utilidades del framework de estilos.

### Tipografía
- **Sans** (cuerpo/UI): `Zen Kaku Gothic New` (Google Fonts), pesos 400/500/700/900. Fallback `system-ui, sans-serif`.
- **Serif** (títulos, kanji, números/marcadores): `Shippori Mincho` (Google Fonts), pesos 500/700/800. Fallback `serif`.
- Escalas típicas: títulos de sección 17px/700 serif; nombres de jugador 15–17px/700; labels 10.5–12px (mayúsculas, `letter-spacing` ~.06–.13em) en `--faint`; marcadores 16–34px serif/800.

### Radios, espaciado, sombras
- Radios: cards grandes 16px; cards medianas 13px; chips/botones 8–11px; discos de mazo círculo (50%).
- Espaciado base múltiplos de ~4px (gap 8/10/12/14/18/22/26px).
- Sombra de "en juego" (TV): `box-shadow: 0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent), 0 4px 16px color-mix(in srgb,var(--accent) 22%,transparent)`.
- Animación `pop` (entrada de cards): `scale(.97)→1` + fade, ~.16s.

---

## Datos: arquetipos de mazo

Lista curada de Standard (Pokémon TCG). Cada uno con `id`, `name` y `color` (el disco de color de la UI). Trasládala a `data/archetypes.ts`. Permite además mazos **"Personalizado"** (nombre libre, color gris `#8a7d70`).

```
charizard   "Charizard ex"     #E8503A
dragapult   "Dragapult ex"     #9c5bd0
gardevoir   "Gardevoir ex"     #B45FB0
ragingbolt  "Raging Bolt ex"   #d2a72b
gholdengo   "Gholdengo ex"     #caa23c
miraidon    "Miraidon ex"      #F2C744
regidrago   "Regidrago VSTAR"  #c98a2a
lugia       "Lugia VSTAR"      #cfc7b0
lostbox     "Lost Zone Box"    #4A90D9
roaringmoon "Roaring Moon ex"  #5a5470
ironthorns  "Iron Thorns ex"   #e0c14a
terapagos   "Terapagos ex"     #7fb9c9
snorlax     "Snorlax Stall"    #9aa0a8
pidgeot     "Pidgeot Control"  #b79b6a
grimmsnarl  "Grimmsnarl ex"    #6a5a8a
banette     "Banette ex"       #9b6fb0
archaludon  "Archaludon ex"    #7f8a9a
conkeldurr  "Conkeldurr"       #C0603A
```

## Assets
- **Fuentes**: Google Fonts (Zen Kaku Gothic New, Shippori Mincho).
- **Iconos de mazo**: actualmente **discos de color** (no imágenes). El cliente preguntó por los iconos 8-bit que Limitless TCG usa en sus listas de torneo — **no incluidos** por ser recursos de ese sitio. Si se obtiene permiso/un set de imágenes, sustituir el disco de color por el icono correspondiente a cada `archetype.id`.
- Sin otras imágenes; el branding es tipográfico (kanji 春夏秋冬 = "las cuatro estaciones").

## Files
- `Torneo Shunka Shuto.dc.html` — prototipo completo (las 3 pantallas + el motor de bracket en la clase `Component`). **Toda la lógica del torneo a portar está aquí**, en JS plano, en estos métodos: `nextPow2`, `seedOrder`, `buildBracket`, `resolveBracket`, `setResultRaw`, `champion`, `wins`, `wonIdxSet`, `availDecks`, `recordGame`, `recomputeMatch`, `undoGame`, `resetDownstream`. Son portables casi tal cual a TS.

## Cómo abordar el port (sugerencia)
1. Portar el **motor** (`engine/bracket.ts`) 1:1 desde los métodos listados arriba y escribir tests (simular torneos N=4…16, verificar conteos y enrutamiento — ya validado aquí).
2. Montar **store + persistencia** (localStorage `shunka_v1` + export/import JSON).
3. Construir las 3 pantallas como componentes, aplicando los tokens de tema.
4. Recrear el **auto-escalado** de la TV.
5. (Opcional) integrar iconos de mazo si se consiguen.
