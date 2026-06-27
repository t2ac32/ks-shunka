export type Theme = 'dotonbori' | 'seasons';

export type DeckRef =
  | { id: string }
  | { custom: true; name: string }
  | null;

export type Player = {
  id: string;
  name: string;
  nickname?: string;
  decks: [DeckRef, DeckRef, DeckRef, DeckRef];
  // full_name as it currently exists in the `registrations` table for this
  // tournament_code. Tracks the DB primary-key half so renames can target the
  // right row. Undefined for players added manually in Setup.
  dbName?: string;
};

export type MatchSource = {
  type: 'winner' | 'loser' | 'loserGF';
  match: string;
};

export type Game = {
  d1: number;
  d2: number;
  winner: 'p1' | 'p2';
};

export type Match = {
  id: string;
  bracket: 'WB' | 'LB' | 'GF';
  round: number;
  slot: number;
  p1: string | 'BYE' | null;
  p2: string | 'BYE' | null;
  src1?: MatchSource;
  src2?: MatchSource;
  winner: string | 'BYE' | null;
  loser: string | 'BYE' | null;
  status: 'pending' | 'banning' | 'playing' | 'done';
  ban: { for1: number | null; for2: number | null };
  games: Game[];
  auto: boolean;
  winnerSide?: 'wb' | 'lb';
  needed?: boolean;
  hidden?: boolean;
};

export type Bracket = {
  matches: Record<string, Match>;
  wb: string[][];
  lb: string[][];
  gf: string[];
  S: number;
  R: number;
  N: number;
};

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
