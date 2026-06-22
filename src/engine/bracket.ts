import type { Player, Match, Bracket, Game, DeckRef } from '../types';

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function seedOrder(S: number): number[] {
  let a = [1, 2];
  while (a.length < S) {
    const n = a.length * 2;
    const x: number[] = [];
    for (const s of a) { x.push(s); x.push(n + 1 - s); }
    a = x;
  }
  return a;
}

export function buildBracket(players: Player[]): Bracket {
  const N = players.length;
  const S = nextPow2(Math.max(2, N));
  const order = seedOrder(S);
  const R = Math.round(Math.log2(S));
  const matches: Record<string, Match> = {};
  const wb: string[][] = [];
  const lb: string[][] = [];

  const mk = (m: Partial<Match> & { id: string; bracket: 'WB' | 'LB' | 'GF'; round: number; slot: number }): void => {
    matches[m.id] = Object.assign(
      { p1: null, p2: null, src1: undefined, src2: undefined, winner: null, loser: null, status: 'pending', ban: { for1: null, for2: null }, games: [], auto: false } as Omit<Match, 'id' | 'bracket' | 'round' | 'slot'>,
      m
    ) as Match;
  };

  for (let r = 1; r <= R; r++) {
    const count = S / Math.pow(2, r);
    const row: string[] = [];
    for (let s = 0; s < count; s++) {
      const id = 'WB-' + r + '-' + s;
      if (r === 1) {
        const sa = order[2 * s], sb = order[2 * s + 1];
        const pa = sa <= N ? players[sa - 1].id : 'BYE';
        const pb = sb <= N ? players[sb - 1].id : 'BYE';
        mk({ id, bracket: 'WB', round: r, slot: s, p1: pa, p2: pb });
      } else {
        mk({ id, bracket: 'WB', round: r, slot: s, src1: { type: 'winner', match: 'WB-' + (r - 1) + '-' + (2 * s) }, src2: { type: 'winner', match: 'WB-' + (r - 1) + '-' + (2 * s + 1) } });
      }
      row.push(id);
    }
    wb.push(row);
  }

  const lbRounds = 2 * (R - 1);
  for (let i = 1; i <= lbRounds; i++) {
    const row: string[] = [];
    if (i === 1) {
      const count = (S / 2) / 2;
      for (let s = 0; s < count; s++) {
        const id = 'LB-1-' + s;
        mk({ id, bracket: 'LB', round: 1, slot: s, src1: { type: 'loser', match: 'WB-1-' + (2 * s) }, src2: { type: 'loser', match: 'WB-1-' + (2 * s + 1) } });
        row.push(id);
      }
    } else if (i % 2 === 0) {
      const prev = lb[i - 2];
      const wbRound = i / 2 + 1;
      const wbRow = wb[wbRound - 1];
      const count = prev.length;
      for (let s = 0; s < count; s++) {
        const id = 'LB-' + i + '-' + s;
        const wbL = wbRow[wbRow.length - 1 - s];
        mk({ id, bracket: 'LB', round: i, slot: s, src1: { type: 'winner', match: prev[s] }, src2: { type: 'loser', match: wbL } });
        row.push(id);
      }
    } else {
      const prev = lb[i - 2];
      const count = prev.length / 2;
      for (let s = 0; s < count; s++) {
        const id = 'LB-' + i + '-' + s;
        mk({ id, bracket: 'LB', round: i, slot: s, src1: { type: 'winner', match: prev[2 * s] }, src2: { type: 'winner', match: prev[2 * s + 1] } });
        row.push(id);
      }
    }
    lb.push(row);
  }

  const wbFinal = wb[wb.length - 1][0];
  const lbFinal = lb[lb.length - 1][0];
  mk({ id: 'GF-1', bracket: 'GF', round: 1, slot: 0, src1: { type: 'winner', match: wbFinal }, src2: { type: 'winner', match: lbFinal } });
  mk({ id: 'GF-2', bracket: 'GF', round: 2, slot: 0, src1: { type: 'winner', match: 'GF-1' }, src2: { type: 'loserGF', match: 'GF-1' }, hidden: true });

  return { matches, wb, lb, gf: ['GF-1', 'GF-2'], S, R, N };
}

export function resolveBracket(bk: Bracket): void {
  const M = bk.matches;

  const gs = (src: Match['src1']): string | null | undefined => {
    if (!src) return undefined;
    const m = M[src.match];
    if (!m) return undefined;
    if (src.type === 'winner') return m.winner;
    if (src.type === 'loser' || src.type === 'loserGF') return m.loser;
    return undefined;
  };

  let changed = true;
  let guard = 0;
  while (changed && guard < 300) {
    changed = false;
    guard++;
    for (const id in M) {
      const m = M[id];
      if (m.src1 && m.p1 == null) { const v = gs(m.src1); if (v != null) { m.p1 = v; changed = true; } }
      if (m.src2 && m.p2 == null) { const v = gs(m.src2); if (v != null) { m.p2 = v; changed = true; } }
      if (id === 'GF-2') {
        const g1 = M['GF-1'];
        m.needed = g1.status === 'done' && g1.winner !== 'BYE' && g1.winnerSide === 'lb';
      }
      if (m.status === 'pending' || m.status === 'banning') {
        const a = m.p1, b = m.p2;
        if (a === 'BYE' && b && b !== 'BYE') { setResultRaw(bk, id, b, true); changed = true; }
        else if (b === 'BYE' && a && a !== 'BYE') { setResultRaw(bk, id, a, true); changed = true; }
        else if (a === 'BYE' && b === 'BYE') { m.winner = 'BYE'; m.loser = 'BYE'; m.status = 'done'; m.auto = true; changed = true; }
        else if (a && b && a !== 'BYE' && b !== 'BYE' && m.status === 'pending') { m.status = 'banning'; }
      }
    }
  }
}

export function setResultRaw(bk: Bracket, id: string, w: string, auto: boolean): void {
  const m = bk.matches[id];
  if (!m) return;
  m.winner = w;
  m.loser = (w === m.p1) ? m.p2 : m.p1;
  m.status = 'done';
  m.auto = !!auto;
  if (m.bracket === 'GF') m.winnerSide = (w === m.p1) ? 'wb' : 'lb';
}

export function champion(bk: Bracket): string | null {
  const g1 = bk.matches['GF-1'];
  if (!g1 || g1.status !== 'done' || g1.winner === 'BYE') return null;
  if (g1.winnerSide === 'wb') return g1.winner;
  const g2 = bk.matches['GF-2'];
  if (g2 && g2.status === 'done') return g2.winner;
  return null;
}

export function wins(m: Match): [number, number] {
  let a = 0, b = 0;
  (m.games || []).forEach((g: Game) => { if (g.winner === 'p1') a++; else b++; });
  return [a, b];
}

export function wonIdxSet(m: Match, side: 'p1' | 'p2'): Set<number> {
  const s = new Set<number>();
  (m.games || []).forEach((g: Game) => { if (g.winner === side) s.add(side === 'p1' ? g.d1 : g.d2); });
  return s;
}

export function availDecks(
  m: Match, side: 'p1' | 'p2', players: Player[]
): Array<{ deckIdx: number; ref: DeckRef }> {
  const pid = side === 'p1' ? m.p1 : m.p2;
  const pmap: Record<string, Player> = {};
  players.forEach(p => { pmap[p.id] = p; });
  if (!pid || pid === 'BYE') return [];
  const p = pmap[pid];
  if (!p) return [];
  const ban = side === 'p1' ? m.ban.for1 : m.ban.for2;
  const won = wonIdxSet(m, side);
  const out: Array<{ deckIdx: number; ref: DeckRef }> = [];
  p.decks.forEach((d, i) => {
    if (d && i !== ban && !won.has(i)) out.push({ deckIdx: i, ref: d });
  });
  return out;
}

export function recordGame(bk: Bracket, matchId: string, d1: number, d2: number, winnerSide: 'p1' | 'p2'): void {
  const m = bk.matches[matchId];
  if (!m) return;
  m.games.push({ d1, d2, winner: winnerSide });
  recomputeMatch(bk, matchId);
  resolveBracket(bk);
}

export function recomputeMatch(bk: Bracket, matchId: string): void {
  const m = bk.matches[matchId];
  if (!m) return;
  const [a, b] = wins(m);
  if (a >= 2) {
    setResultRaw(bk, m.id, m.p1 as string, false);
  } else if (b >= 2) {
    setResultRaw(bk, m.id, m.p2 as string, false);
  } else if (m.status === 'done') {
    m.winner = null;
    m.loser = null;
    m.status = 'playing';
    if (m.bracket === 'GF') m.winnerSide = undefined;
    resetDownstream(bk, m.id);
  }
}

export function undoGame(bk: Bracket, matchId: string, gameIdx: number): void {
  const m = bk.matches[matchId];
  if (!m) return;
  m.games.splice(gameIdx, 1);
  recomputeMatch(bk, matchId);
  resolveBracket(bk);
}

export function resetDownstream(bk: Bracket, matchId: string): void {
  for (const id in bk.matches) {
    const m = bk.matches[id];
    let hit = false;
    if (m.src1 && m.src1.match === matchId) { m.p1 = null; hit = true; }
    if (m.src2 && m.src2.match === matchId) { m.p2 = null; hit = true; }
    if (hit) {
      m.winner = null;
      m.loser = null;
      m.status = 'pending';
      m.games = [];
      m.ban = { for1: null, for2: null };
      m.auto = false;
      if (m.bracket === 'GF') m.winnerSide = undefined;
      resetDownstream(bk, id);
    }
  }
}
