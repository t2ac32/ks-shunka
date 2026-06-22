import { describe, test, expect } from 'vitest';
import {
  buildBracket, resolveBracket, champion, wins,
  resetDownstream, recordGame, undoGame, setResultRaw,
} from './bracket';
import type { Player } from '../types';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    decks: [{ id: 'charizard' }, { id: 'dragapult' }, { id: 'gardevoir' }, { id: 'ragingbolt' }],
  }));
}

describe('buildBracket + resolveBracket', () => {
  const cases: Array<{ N: number; expectedWbRounds: number; expectedLbRounds: number }> = [
    { N: 4,  expectedWbRounds: 2, expectedLbRounds: 2 },
    { N: 6,  expectedWbRounds: 3, expectedLbRounds: 4 },
    { N: 8,  expectedWbRounds: 3, expectedLbRounds: 4 },
    { N: 12, expectedWbRounds: 4, expectedLbRounds: 6 },
    { N: 16, expectedWbRounds: 4, expectedLbRounds: 6 },
  ];

  for (const { N, expectedWbRounds, expectedLbRounds } of cases) {
    test(`N=${N}: bracket has correct structure and resolveBracket does not throw`, () => {
      const players = makePlayers(N);
      const bk = buildBracket(players);

      expect(bk.wb.length).toBe(expectedWbRounds);
      expect(bk.lb.length).toBe(expectedLbRounds);
      expect(bk.gf).toHaveLength(2);
      expect(() => resolveBracket(bk)).not.toThrow();
    });
  }
});

describe('BYE auto-resolution', () => {
  test('all matches with auto=true have status=done after resolveBracket', () => {
    for (const N of [4, 6, 8, 12, 16]) {
      const bk = buildBracket(makePlayers(N));
      resolveBracket(bk);
      for (const m of Object.values(bk.matches)) {
        if (m.auto) {
          expect(m.status).toBe('done');
        }
      }
    }
  });

  test('BYE matches (both players known, at least one BYE) resolve with auto=true', () => {
    const bk = buildBracket(makePlayers(6));
    resolveBracket(bk);
    for (const m of Object.values(bk.matches)) {
      const bothKnown = m.p1 != null && m.p2 != null;
      const hasBye = m.p1 === 'BYE' || m.p2 === 'BYE';
      if (bothKnown && hasBye) {
        expect(m.auto).toBe(true);
        expect(m.status).toBe('done');
        expect(m.winner).not.toBeNull();
      }
    }
  });
});

describe('Full tournament simulation N=8', () => {
  test('champion is non-null after all non-BYE matches have a result', () => {
    const players = makePlayers(8);
    const bk = buildBracket(players);
    resolveBracket(bk);

    let iterations = 0;
    while (champion(bk) === null && iterations < 200) {
      iterations++;
      let advanced = false;
      for (const m of Object.values(bk.matches)) {
        if (m.status === 'banning' || m.status === 'playing') {
          if (m.p1 && m.p2 && m.p1 !== 'BYE' && m.p2 !== 'BYE') {
            m.status = 'playing';
            recordGame(bk, m.id, 0, 1, 'p1');
            recordGame(bk, m.id, 0, 1, 'p1');
            resolveBracket(bk);
            advanced = true;
            break;
          }
        }
      }
      if (!advanced) break;
    }

    expect(champion(bk)).not.toBeNull();
  });
});

describe('Loser routing N=8', () => {
  test('p2 players from WB round 1 appear in LB round 1 after WB round 1 completes', () => {
    const players = makePlayers(8);
    const bk = buildBracket(players);
    resolveBracket(bk);

    const wbRound1 = bk.wb[0];
    const p2Losers = new Set<string>();

    for (const matchId of wbRound1) {
      const m = bk.matches[matchId];
      if (m.p1 && m.p2 && m.p1 !== 'BYE' && m.p2 !== 'BYE') {
        m.status = 'playing';
        recordGame(bk, matchId, 0, 1, 'p1');
        recordGame(bk, matchId, 0, 1, 'p1');
        p2Losers.add(m.p2);
      }
    }

    resolveBracket(bk);

    const lbRound1 = bk.lb[0];
    const lbParticipants = new Set<string>();
    for (const matchId of lbRound1) {
      const m = bk.matches[matchId];
      if (m.p1 && m.p1 !== 'BYE') lbParticipants.add(m.p1);
      if (m.p2 && m.p2 !== 'BYE') lbParticipants.add(m.p2);
    }

    for (const loser of p2Losers) {
      expect(lbParticipants.has(loser)).toBe(true);
    }
  });
});

describe('resetDownstream', () => {
  test('N=4: recording then resetting WB-1-0 clears dependent matches', () => {
    const players = makePlayers(4);
    const bk = buildBracket(players);
    resolveBracket(bk);

    const firstMatch = bk.matches['WB-1-0'];
    firstMatch.status = 'playing';
    recordGame(bk, 'WB-1-0', 0, 1, 'p1');
    recordGame(bk, 'WB-1-0', 0, 1, 'p1');
    resolveBracket(bk);

    expect(bk.matches['WB-1-0'].status).toBe('done');

    resetDownstream(bk, 'WB-1-0');

    for (const id in bk.matches) {
      const m = bk.matches[id];
      if (id === 'WB-1-0') continue;
      const dependsOnWB10 = (m.src1?.match === 'WB-1-0') || (m.src2?.match === 'WB-1-0');
      if (dependsOnWB10) {
        expect(m.winner).toBeNull();
        expect(m.loser).toBeNull();
        expect(m.games).toHaveLength(0);
      }
    }
  });
});

describe('wins helper', () => {
  test('counts p1 and p2 wins correctly', () => {
    const bk = buildBracket(makePlayers(4));
    const m = Object.values(bk.matches)[0];
    m.games = [
      { d1: 0, d2: 1, winner: 'p1' },
      { d1: 0, d2: 2, winner: 'p2' },
      { d1: 0, d2: 1, winner: 'p1' },
    ];
    expect(wins(m)).toEqual([2, 1]);
  });
});

describe('undoGame', () => {
  test('removes a game and recomputes match state', () => {
    const players = makePlayers(4);
    const bk = buildBracket(players);
    resolveBracket(bk);

    const matchId = bk.wb[0][0];
    const m = bk.matches[matchId];
    m.status = 'playing';

    recordGame(bk, matchId, 0, 1, 'p1');
    recordGame(bk, matchId, 0, 1, 'p1');
    expect(bk.matches[matchId].status).toBe('done');

    undoGame(bk, matchId, 1);
    expect(bk.matches[matchId].games).toHaveLength(1);
    expect(bk.matches[matchId].status).not.toBe('done');
  });
});

describe('setResultRaw', () => {
  test('sets winner, loser, status=done, and auto flag', () => {
    const bk = buildBracket(makePlayers(4));
    const id = bk.wb[0][0];
    const m = bk.matches[id];
    expect(m.p1).not.toBeNull();
    setResultRaw(bk, id, m.p1 as string, false);
    expect(bk.matches[id].winner).toBe(m.p1);
    expect(bk.matches[id].loser).toBe(m.p2);
    expect(bk.matches[id].status).toBe('done');
    expect(bk.matches[id].auto).toBe(false);
  });
});
