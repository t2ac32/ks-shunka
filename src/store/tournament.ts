import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Tournament, Player, DeckRef, Theme } from '../types';
import {
  buildBracket,
  resolveBracket,
  recordGame as engineRecordGame,
  undoGame as engineUndoGame,
} from '../engine/bracket';
import { supabase } from '../lib/supabase';

const LS_KEY = 'shunka_v1';

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
  };
}

function persist(t: Tournament): void {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...t, savedAt: Date.now() }));
}

function loadSaved(): Tournament {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return blankT();
    return JSON.parse(raw) as Tournament;
  } catch {
    return blankT();
  }
}

type TournamentStore = {
  t: Tournament;
  setName(name: string): void;
  setTheme(theme: Theme): void;
  setSeedMode(mode: 'random' | 'manual'): void;
  setRegistrationCode(code: string): void;
  addPlayer(name: string): void;
  removePlayer(id: string): void;
  renamePlayer(id: string, name: string): void;
  pickDeck(playerId: string, slot: 0 | 1 | 2 | 3, value: DeckRef): void;
  shuffle(): void;
  startTournament(): void;
  backToEdit(): void;
  wipe(): void;
  setBan(matchId: string, forSide: 1 | 2, deckIdx: number): void;
  confirmBan(matchId: string): void;
  recordGame(matchId: string, d1: number, d2: number, winnerSide: 'p1' | 'p2'): void;
  undoGame(matchId: string, gameIdx: number): void;
  exportJSON(): void;
  loadFromJSON(data: Tournament): void;
  loadRegistrations(code: string): Promise<{ count: number; loaded: number }>;
};

export const useTournamentStore = create<TournamentStore>()(
  immer((set, get) => ({
    t: loadSaved(),

    setName(name) {
      set(s => { s.t.name = name; });
      persist(get().t);
    },

    setTheme(theme) {
      set(s => { s.t.theme = theme; });
      persist(get().t);
    },

    setSeedMode(mode) {
      set(s => { s.t.seedMode = mode; });
      persist(get().t);
    },

    setRegistrationCode(code) {
      set(s => { s.t.registrationCode = code; });
      persist(get().t);
    },

    addPlayer(name) {
      const player: Player = {
        id: 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2),
        name,
        decks: [null, null, null, null],
      };
      set(s => { s.t.players.push(player); });
      persist(get().t);
    },

    removePlayer(id) {
      set(s => { s.t.players = s.t.players.filter(p => p.id !== id); });
      persist(get().t);
    },

    renamePlayer(id, name) {
      set(s => {
        const p = s.t.players.find(pl => pl.id === id);
        if (p) p.name = name;
      });
      persist(get().t);
    },

    pickDeck(playerId, slot, value) {
      set(s => {
        const p = s.t.players.find(pl => pl.id === playerId);
        if (p) p.decks[slot] = value;
      });
      persist(get().t);
    },

    shuffle() {
      set(s => {
        const arr = s.t.players;
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      });
      persist(get().t);
    },

    startTournament() {
      const { t } = get();
      if (t.players.length < 4) return;
      const players = [...t.players];
      if (t.seedMode === 'random') {
        for (let i = players.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [players[i], players[j]] = [players[j], players[i]];
        }
      }
      const bk = structuredClone(buildBracket(players));
      resolveBracket(bk);
      set(s => {
        s.t.players = players;
        s.t.bk = bk;
        s.t.status = 'running';
      });
      persist(get().t);
    },

    backToEdit() {
      set(s => {
        s.t.bk = null;
        s.t.status = 'setup';
      });
      persist(get().t);
    },

    wipe() {
      const fresh = blankT();
      set({ t: fresh });
      persist(fresh);
    },

    setBan(matchId, forSide, deckIdx) {
      set(s => {
        if (!s.t.bk) return;
        const m = s.t.bk.matches[matchId];
        if (!m) return;
        if (forSide === 1) m.ban.for1 = deckIdx;
        else m.ban.for2 = deckIdx;
      });
      persist(get().t);
    },

    confirmBan(matchId) {
      set(s => {
        if (!s.t.bk) return;
        const m = s.t.bk.matches[matchId];
        if (!m) return;
        if (m.ban.for1 !== null && m.ban.for2 !== null) {
          m.status = 'playing';
        }
      });
      persist(get().t);
    },

    recordGame(matchId, d1, d2, winnerSide) {
      set(s => {
        if (!s.t.bk) return;
        engineRecordGame(s.t.bk, matchId, d1, d2, winnerSide);
      });
      persist(get().t);
    },

    undoGame(matchId, gameIdx) {
      set(s => {
        if (!s.t.bk) return;
        engineUndoGame(s.t.bk, matchId, gameIdx);
      });
      persist(get().t);
    },

    exportJSON() {
      const t = get().t;
      const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shunka-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    loadFromJSON(data) {
      set({ t: data });
      persist(data);
    },

    async loadRegistrations(code) {
      const { data, error } = await supabase
        .from('registrations')
        .select('full_name, nickname, decks')
        .eq('tournament_code', code);
      if (error || !data) return { count: 0, loaded: 0 };
      const existing = new Set(get().t.players.map(p => p.name.toLowerCase()));
      type Row = { full_name: string; nickname: string | null; decks: DeckRef[] };
      const newPlayers: Player[] = (data as Row[])
        .filter(r => !existing.has(r.full_name.toLowerCase()))
        .map(r => ({
          id: 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2),
          name: r.full_name,
          nickname: r.nickname ?? undefined,
          decks: (r.decks as DeckRef[]).slice(0, 4).concat(
            Array<DeckRef>(Math.max(0, 4 - (r.decks as DeckRef[]).length)).fill(null)
          ) as [DeckRef, DeckRef, DeckRef, DeckRef],
        }));
      set(s => { s.t.players.push(...newPlayers); });
      persist(get().t);
      return { count: data.length, loaded: newPlayers.length };
    },
  }))
);
