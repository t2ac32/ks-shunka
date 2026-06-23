import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournament';
import { wins, availDecks, champion } from '../engine/bracket';
import { deckColor, deckLabel } from '../data/archetypes';
import DeckDot from '../components/DeckDot';
import { timerRemaining, formatTimer } from '../lib/timer';
import type { Match, Player } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function roundLabel(m: Match): string {
  if (m.bracket === 'GF') return 'Gran Final';
  const bracketName = m.bracket === 'WB' ? 'Winners' : 'Losers';
  // detect if this is the final round of the bracket
  const roundName = `R${m.round}`;
  return `${bracketName} · ${roundName}`;
}

function roundLabelFull(m: Match): string {
  if (m.bracket === 'GF') return 'Gran Final';
  const bracketName = m.bracket === 'WB' ? 'WB' : 'LB';
  return `${bracketName} · Ronda ${m.round}`;
}

function tagBg(m: Match): string {
  if (m.bracket === 'GF') return 'color-mix(in srgb, var(--accent) 18%, var(--panel2))';
  if (m.bracket === 'WB') return 'color-mix(in srgb, var(--accent2) 18%, var(--panel2))';
  return 'color-mix(in srgb, var(--dim) 18%, var(--panel2))';
}

function tagInk(m: Match): string {
  if (m.bracket === 'GF') return 'var(--accent)';
  if (m.bracket === 'WB') return 'var(--accent2)';
  return 'var(--dim)';
}

function playerName(pid: string | 'BYE' | null, players: Player[]): string {
  if (!pid || pid === 'BYE') return 'BYE';
  return players.find(p => p.id === pid)?.name ?? pid;
}

function sortMatches(matches: Match[]): Match[] {
  const order = { WB: 0, LB: 1, GF: 2 };
  return [...matches].sort((a, b) => {
    const bDiff = order[a.bracket] - order[b.bracket];
    if (bDiff !== 0) return bDiff;
    const rDiff = a.round - b.round;
    if (rDiff !== 0) return rDiff;
    return a.slot - b.slot;
  });
}

// ─── Tag pill ────────────────────────────────────────────────────────────────

function TagPill({ m }: { m: Match }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      padding: '3px 8px',
      borderRadius: 6,
      background: tagBg(m),
      color: tagInk(m),
    }}>
      {roundLabel(m)}
    </span>
  );
}

// ─── View A ──────────────────────────────────────────────────────────────────

function NotStarted() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--faint)' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--line2)', marginBottom: 10 }}>⚏</div>
      <p style={{ fontSize: 14 }}>El torneo aún no ha comenzado.<br />Ve a <b style={{ color: 'var(--dim)' }}>Inscripción</b> e inicia el torneo.</p>
    </div>
  );
}

// ─── View B ──────────────────────────────────────────────────────────────────

type MatchListProps = {
  matches: Record<string, Match>;
  players: Player[];
  onSelect: (id: string) => void;
  champId: string | null;
};

function MatchList({ matches, players, onSelect, champId }: MatchListProps) {
  const allMatches = Object.values(matches);

  const liveMatches = sortMatches(allMatches.filter(m => {
    if (m.status !== 'banning' && m.status !== 'playing') return false;
    if (!m.p1 || m.p1 === 'BYE' || !m.p2 || m.p2 === 'BYE') return false;
    if (m.id === 'GF-2' && !m.needed) return false;
    return true;
  }));

  const doneMatches = sortMatches(allMatches.filter(m => {
    if (m.status !== 'done') return false;
    if (m.auto) return false;
    if (!m.p1 || m.p1 === 'BYE' || !m.p2 || m.p2 === 'BYE') return false;
    return true;
  }));

  const champName = champId ? playerName(champId, players) : null;

  return (
    <div>
      {champName && (
        <div style={{
          background: 'linear-gradient(135deg, color-mix(in srgb,var(--accent2) 30%,var(--panel)), var(--panel))',
          border: '1px solid var(--accent2)',
          borderRadius: 16,
          padding: 22,
          textAlign: 'center',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--accent2)', marginBottom: 6 }}>
            Campeón 優勝
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 800 }}>
            🏆 {champName}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
        <span style={{ width: 7, height: 18, background: 'var(--accent)', borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700 }}>
          Partidas por jugar
        </h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)' }}>
          {liveMatches.length} activas
        </span>
      </div>

      {liveMatches.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
          No hay partidas activas en este momento. Espera a que avancen las rondas o revisa la TV.
        </p>
      )}

      {liveMatches.map(m => {
        const [s1, s2] = wins(m);
        const p1Name = playerName(m.p1, players);
        const p2Name = playerName(m.p2, players);
        const isPlaying = m.status === 'playing';
        const phaseLabel = m.status === 'banning' ? 'Baneo pendiente' : 'Bo3 en juego';
        const cta = m.status === 'banning' ? 'Registrar' : 'Continuar';
        const leaderIsP1 = s1 > s2;
        const leaderIsP2 = s2 > s1;

        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'var(--panel)',
              border: isPlaying ? '1px solid var(--accent)' : '1px solid var(--line)',
              borderRadius: 13,
              padding: '13px 14px',
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <TagPill m={m} />
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>{phaseLabel}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent2)', fontWeight: 700 }}>
                {cta} →
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 15, minWidth: 0 }}>
                {p1Name}
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: leaderIsP1 ? 'var(--accent2)' : 'var(--dim)',
                }}>
                  {s1}
                </span>
                <span style={{ color: 'var(--faint)', fontSize: 12 }}>·</span>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: leaderIsP2 ? 'var(--accent2)' : 'var(--dim)',
                }}>
                  {s2}
                </span>
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 15, minWidth: 0 }}>
                {p2Name}
              </div>
            </div>
          </button>
        );
      })}

      {doneMatches.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--dim)', fontSize: 13, padding: '8px 0' }}>
            Partidas terminadas ({doneMatches.length})
          </summary>
          {doneMatches.map(m => {
            const [s1, s2] = wins(m);
            const p1Name = playerName(m.p1, players);
            const p2Name = playerName(m.p2, players);
            const w1 = m.winner === m.p1;
            const w2 = m.winner === m.p2;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  marginTop: 7,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--faint)', width: 54, flexShrink: 0 }}>
                  {roundLabel(m)}
                </span>
                <span style={{
                  flex: 1,
                  textAlign: 'right',
                  fontWeight: w1 ? 700 : 400,
                  color: w1 ? 'var(--ink)' : 'var(--faint)',
                }}>
                  {p1Name}
                </span>
                <span style={{ color: 'var(--dim)', fontWeight: 700 }}>{s1}–{s2}</span>
                <span style={{
                  flex: 1,
                  fontWeight: w2 ? 700 : 400,
                  color: w2 ? 'var(--ink)' : 'var(--faint)',
                }}>
                  {p2Name}
                </span>
                <button
                  onClick={() => onSelect(m.id)}
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    color: 'var(--faint)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  editar
                </button>
              </div>
            );
          })}
        </details>
      )}
    </div>
  );
}

// ─── View C ──────────────────────────────────────────────────────────────────

type MatchDetailProps = {
  matchId: string;
  matches: Record<string, Match>;
  players: Player[];
  onBack: () => void;
  store: {
    setBan: (matchId: string, forSide: 1 | 2, deckIdx: number) => void;
    confirmBan: (matchId: string) => void;
    recordGame: (matchId: string, d1: number, d2: number, winnerSide: 'p1' | 'p2') => void;
    undoGame: (matchId: string, gameIdx: number) => void;
  };
};

function MatchDetail({ matchId, matches, players, onBack, store }: MatchDetailProps) {
  const m = matches[matchId];
  const [gSel1, setGSel1] = useState('');
  const [gSel2, setGSel2] = useState('');

  if (!m) return null;

  const p1Name = playerName(m.p1, players);
  const p2Name = playerName(m.p2, players);
  const [s1, s2] = wins(m);

  const p1Player = players.find(p => p.id === m.p1);
  const p2Player = players.find(p => p.id === m.p2);

  // Scoreboard styling
  const leaderIsP1 = s1 > s2;
  const leaderIsP2 = s2 > s1;
  const p1Won = s1 === 2;
  const p2Won = s2 === 2;

  const d1Bg = leaderIsP1
    ? 'color-mix(in srgb, var(--accent2) 8%, var(--panel2))'
    : 'var(--panel2)';
  const d2Bg = leaderIsP2
    ? 'color-mix(in srgb, var(--accent2) 8%, var(--panel2))'
    : 'var(--panel2)';
  const d1Border = p1Won ? '2px solid var(--accent2)' : '1px solid var(--line)';
  const d2Border = p2Won ? '2px solid var(--accent2)' : '1px solid var(--line)';

  // Available decks for next game
  const p1Avail = availDecks(m, 'p1', players);
  const p2Avail = availDecks(m, 'p2', players);

  const canRecord = gSel1 !== '' && gSel2 !== '';
  const nextGameNo = m.games.length + 1;

  function handleRecordGame(side: 'p1' | 'p2') {
    if (!canRecord) return;
    store.recordGame(matchId, parseInt(gSel1), parseInt(gSel2), side);
    setGSel1('');
    setGSel2('');
  }

  const winBtnBase: React.CSSProperties = {
    flex: 1,
    height: 42,
    borderRadius: 10,
    border: 'none',
    fontWeight: 700,
    fontSize: 14,
    cursor: canRecord ? 'pointer' : 'not-allowed',
    opacity: canRecord ? 1 : 0.4,
  };

  return (
    <div style={{ animation: 'pop .14s ease' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--dim)',
          fontSize: 14,
          cursor: 'pointer',
          padding: '4px 0',
          marginBottom: 8,
        }}
      >
        ← Volver
      </button>

      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TagPill m={m} />
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>Best of 3 · Conquista</span>
        </div>

        {/* Header title */}
        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14, fontWeight: 700 }}>
          {roundLabelFull(m)}
        </div>

        {/* Scoreboard */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 16 }}>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: 12,
            borderRadius: 12,
            background: d1Bg,
            border: d1Border,
          }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{p1Name}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 800, color: 'var(--accent2)' }}>
              {s1}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--serif)', color: 'var(--faint)', fontSize: 14 }}>
            vs
          </div>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: 12,
            borderRadius: 12,
            background: d2Bg,
            border: d2Border,
          }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{p2Name}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 800, color: 'var(--accent2)' }}>
              {s2}
            </div>
          </div>
        </div>

        {/* BAN PHASE */}
        {m.status === 'banning' && (
          <div>
            <div style={{
              fontSize: 13,
              color: 'var(--dim)',
              marginBottom: 12,
              lineHeight: 1.5,
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '11px 12px',
            }}>
              <b style={{ color: 'var(--ink)' }}>Fase de baneo.</b> Cada jugador prohíbe <b>1 mazo</b> del rival. Quedan 3 mazos por jugador para el Bo3.
            </div>

            {/* p2 bans from p1 → sets ban.for1 */}
            <div style={{
              fontSize: 12,
              color: 'var(--faint)',
              margin: '0 0 7px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}>
              {p2Name} banea un mazo de {p1Name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {p1Player?.decks.map((d, i) => {
                if (!d) return null;
                const isBanned = m.ban.for1 === i;
                const color = deckColor(d);
                const label = deckLabel(d) ?? `Mazo ${i + 1}`;
                return (
                  <button
                    key={i}
                    onClick={() => store.setBan(matchId, 1, i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isBanned ? '1px solid var(--bad)' : '1px solid var(--line)',
                      background: isBanned ? 'color-mix(in srgb, var(--bad) 10%, var(--panel2))' : 'var(--panel2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <DeckDot color={color} size={20} />
                    <span style={{
                      flex: 1,
                      textDecoration: isBanned ? 'line-through' : 'none',
                      color: isBanned ? 'var(--bad)' : 'var(--ink)',
                      fontSize: 14,
                    }}>
                      {label}
                    </span>
                    {isBanned && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bad)' }}>
                        BANEADO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* p1 bans from p2 → sets ban.for2 */}
            <div style={{
              fontSize: 12,
              color: 'var(--faint)',
              margin: '0 0 7px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}>
              {p1Name} banea un mazo de {p2Name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
              {p2Player?.decks.map((d, i) => {
                if (!d) return null;
                const isBanned = m.ban.for2 === i;
                const color = deckColor(d);
                const label = deckLabel(d) ?? `Mazo ${i + 1}`;
                return (
                  <button
                    key={i}
                    onClick={() => store.setBan(matchId, 2, i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isBanned ? '1px solid var(--bad)' : '1px solid var(--line)',
                      background: isBanned ? 'color-mix(in srgb, var(--bad) 10%, var(--panel2))' : 'var(--panel2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <DeckDot color={color} size={20} />
                    <span style={{
                      flex: 1,
                      textDecoration: isBanned ? 'line-through' : 'none',
                      color: isBanned ? 'var(--bad)' : 'var(--ink)',
                      fontSize: 14,
                    }}>
                      {label}
                    </span>
                    {isBanned && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bad)' }}>
                        BANEADO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => store.confirmBan(matchId)}
              disabled={m.ban.for1 === null || m.ban.for2 === null}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                border: 'none',
                background: (m.ban.for1 !== null && m.ban.for2 !== null) ? 'var(--accent2)' : 'var(--line)',
                color: (m.ban.for1 !== null && m.ban.for2 !== null) ? 'var(--accentInk)' : 'var(--faint)',
                fontWeight: 700,
                fontSize: 15,
                cursor: (m.ban.for1 !== null && m.ban.for2 !== null) ? 'pointer' : 'not-allowed',
              }}
            >
              Confirmar baneos y empezar Bo3 →
            </button>
          </div>
        )}

        {/* PLAY / DONE PHASE */}
        {(m.status === 'playing' || m.status === 'done') && (
          <div>
            {/* Past games */}
            {m.games.map((g, i) => {
              const p1IsWinner = g.winner === 'p1';
              const p2IsWinner = g.winner === 'p2';
              const d1Ref = p1Player?.decks[g.d1] ?? null;
              const d2Ref = p2Player?.decks[g.d2] ?? null;
              const d1Color = deckColor(d1Ref);
              const d2Color = deckColor(d2Ref);
              const d1LabelText = deckLabel(d1Ref) ?? `Mazo ${g.d1 + 1}`;
              const d2LabelText = deckLabel(d2Ref) ?? `Mazo ${g.d2 + 1}`;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 11px',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    marginBottom: 8,
                    fontSize: 13,
                    background: 'var(--bg2)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 700, flexShrink: 0 }}>
                    G{i + 1}
                  </span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: 1,
                    fontWeight: p1IsWinner ? 700 : 400,
                    color: p1IsWinner ? 'var(--ink)' : 'var(--faint)',
                  }}>
                    <span style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: d1Color,
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    {d1LabelText}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>
                    {p1IsWinner ? '1–0' : '0–1'}
                  </span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: 1,
                    justifyContent: 'flex-end',
                    fontWeight: p2IsWinner ? 700 : 400,
                    color: p2IsWinner ? 'var(--ink)' : 'var(--faint)',
                  }}>
                    {d2LabelText}
                    <span style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: d2Color,
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                  </span>
                  <button
                    onClick={() => store.undoGame(matchId, i)}
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      color: 'var(--faint)',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Next game entry — only when still playing */}
            {m.status === 'playing' && (
              <div style={{
                border: '1px dashed var(--line2)',
                borderRadius: 12,
                padding: 13,
                marginTop: 6,
              }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--accent2)',
                  fontWeight: 700,
                  marginBottom: 11,
                }}>
                  Juego {nextGameNo} — mazo distinto al que ya ganó cada quien
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 5, fontWeight: 700 }}>
                      {p1Name}
                    </div>
                    <select
                      value={gSel1}
                      onChange={e => setGSel1(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        borderRadius: 9,
                        border: '1px solid var(--line2)',
                        background: 'var(--bg2)',
                        color: 'var(--ink)',
                        padding: '0 10px',
                        fontSize: 13,
                      }}
                    >
                      <option value="">Mazo…</option>
                      {p1Avail.map(({ deckIdx, ref }) => (
                        <option key={deckIdx} value={String(deckIdx)}>
                          {deckLabel(ref) ?? `Mazo ${deckIdx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 5, fontWeight: 700 }}>
                      {p2Name}
                    </div>
                    <select
                      value={gSel2}
                      onChange={e => setGSel2(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        borderRadius: 9,
                        border: '1px solid var(--line2)',
                        background: 'var(--bg2)',
                        color: 'var(--ink)',
                        padding: '0 10px',
                        fontSize: 13,
                      }}
                    >
                      <option value="">Mazo…</option>
                      {p2Avail.map(({ deckIdx, ref }) => (
                        <option key={deckIdx} value={String(deckIdx)}>
                          {deckLabel(ref) ?? `Mazo ${deckIdx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 8 }}>
                  ¿Quién ganó el juego {nextGameNo}?
                </div>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button
                    onClick={() => handleRecordGame('p1')}
                    disabled={!canRecord}
                    style={{
                      ...winBtnBase,
                      background: 'var(--accent2)',
                      color: 'var(--accentInk)',
                    }}
                  >
                    Gana {p1Name}
                  </button>
                  <button
                    onClick={() => handleRecordGame('p2')}
                    disabled={!canRecord}
                    style={{
                      ...winBtnBase,
                      background: 'var(--panel2)',
                      color: 'var(--ink)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    Gana {p2Name}
                  </button>
                </div>
              </div>
            )}

            {/* Winner banner */}
            {m.status === 'done' && (
              <div style={{
                textAlign: 'center',
                padding: 14,
                borderRadius: 12,
                background: 'color-mix(in srgb,var(--good) 16%,var(--panel))',
                border: '1px solid color-mix(in srgb,var(--good) 45%,var(--line))',
                marginTop: 6,
              }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--good)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}>
                  Ganador de la ronda
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 800 }}>
                  {playerName(m.winner, players)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function Judge() {
  const store = useTournamentStore();
  const { t } = store;
  const [selMatchId, setSelMatchId] = useState<string | null>(null);

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

  const containerStyle: React.CSSProperties = {
    maxWidth: 560,
    margin: '0 auto',
    padding: 'clamp(14px,3vw,22px) clamp(12px,3vw,18px) 100px',
  };

  if (t.status !== 'running') {
    return (
      <main style={containerStyle}>
        <NotStarted />
      </main>
    );
  }

  const bk = t.bk!;
  const champId = champion(bk);

  if (selMatchId !== null) {
    return (
      <main style={containerStyle}>
        <MatchDetail
          matchId={selMatchId}
          matches={bk.matches}
          players={t.players}
          onBack={() => setSelMatchId(null)}
          store={store}
        />
      </main>
    );
  }

  return (
    <main style={containerStyle}>
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

      <MatchList
        matches={bk.matches}
        players={t.players}
        onSelect={setSelMatchId}
        champId={champId}
      />
    </main>
  );
}
