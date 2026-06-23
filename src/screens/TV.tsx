import { useRef, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournament';
import { champion } from '../engine/bracket';
import MatchCard from '../components/MatchCard';
import { timerRemaining, formatTimer } from '../lib/timer';
import type { Bracket, Player } from '../types';

function wbRoundLabel(i: number, total: number): string {
  if (i === total - 1) return 'Final';
  if (i === total - 2) return 'Semifinal';
  return 'Ronda ' + (i + 1);
}

function lbRoundLabel(i: number): string {
  return 'Ronda LB ' + (i + 1);
}

function BracketSection({
  bk,
  pmap,
  rounds,
  getRoundLabel,
  barColor,
  title,
  kanji,
  minCardHeight,
}: {
  bk: Bracket;
  pmap: Record<string, Player>;
  rounds: string[][];
  getRoundLabel: (i: number, total: number) => string;
  barColor: string;
  title: string;
  kanji: string;
  minCardHeight: number;
}) {
  return (
    <section
      style={{
        background: 'color-mix(in srgb,var(--panel) 55%,transparent)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span
          style={{
            width: 6,
            height: 16,
            background: barColor,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </h3>
        <span style={{ fontFamily: 'var(--serif)', color: 'var(--faint)', fontSize: 13 }}>
          {kanji}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'stretch' }}>
        {rounds.map((round, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--dim)',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: 8,
                height: 20,
              }}
            >
              {getRoundLabel(rIdx, rounds.length)}
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                gap: 8,
                minHeight: minCardHeight,
              }}
            >
              {round.map((matchId) => {
                const match = bk.matches[matchId];
                if (!match) return null;
                return <MatchCard key={matchId} match={match} players={pmap} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TV() {
  const t = useTournamentStore((s) => s.t);
  const bk = t.bk;

  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const timer = useTournamentStore(s => s.t.timer);
  const stream = useTournamentStore(s => s.t.stream);
  const setLiveActive = useTournamentStore(s => s.setLiveActive);
  const setPlayerOrder = useTournamentStore(s => s.setPlayerOrder);
  const startTournament = useTournamentStore(s => s.startTournament);
  const [remaining, setRemaining] = useState(() => timerRemaining(timer));
  const [draftSeeds, setDraftSeeds] = useState<(string | null)[]>(() => {
    const seeds: (string | null)[] = Array(8).fill(null);
    t.players.forEach((p, i) => { if (i < 8) seeds[i] = p.id; });
    return seeds;
  });
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [lockedSlot, setLockedSlot] = useState<number | null>(null);

  // Bracket layout constants (pixels)
  const SH = 52, SG = 8, MH = 2 * SH + SG, MG = 32;
  const TH = 2 * MH + MG;
  const EW = 22, AW = 44;
  const M1M = SH + SG / 2;
  const M2M = MH + MG + SH + SG / 2;
  const CM = Math.round((M1M + M2M) / 2);

  function playSwordSound() {
    try {
      const ctx = new AudioContext();
      const sr = ctx.sampleRate;
      const dur = 0.55;
      const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        const s = i / sr;
        const scrape = (Math.random() * 2 - 1) * Math.exp(-s * 18) * 0.45;
        const sweep = Math.sin(2 * Math.PI * (3800 - 3400 * (s / dur)) * s) * Math.exp(-s * 7) * 0.2;
        const ring = Math.sin(2 * Math.PI * 820 * s) * Math.exp(-Math.max(0, s - 0.14) * 20) * (s > 0.12 ? 0.32 : 0);
        ch[i] = scrape + sweep + ring;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
      src.onended = () => { try { ctx.close(); } catch { /* ignore */ } };
    } catch { /* audio not available */ }
  }

  function handleSlotDrop(slotIdx: number) {
    if (dragPlayerId === null) return;
    const next = [...draftSeeds];
    const existingSlot = next.findIndex(id => id === dragPlayerId);
    const occupant = next[slotIdx];
    if (existingSlot !== -1) next[existingSlot] = occupant ?? null;
    next[slotIdx] = dragPlayerId;
    setDraftSeeds(next);
    setLockedSlot(slotIdx);
    playSwordSound();
    setDragPlayerId(null);
    setTimeout(() => setLockedSlot(null), 700);
  }

  function handleDraftStart() {
    const orderedIds = draftSeeds.filter((id): id is string => id !== null);
    setPlayerOrder(orderedIds);
    startTournament();
  }

  useEffect(() => {
    setRemaining(timerRemaining(timer));
    if (!timer.running) return;
    const id = setInterval(() => setRemaining(timerRemaining(timer)), 1000);
    return () => clearInterval(id);
  }, [timer.running, timer.startedAt, timer.duration]);

  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner) return;
      const natW = 1850;
      const natH = inner.scrollHeight;
      const s = Math.min(wrap.clientWidth / natW, wrap.clientHeight / natH);
      setScale(Math.min(Math.max(s, 0.25), 1.9));
    };
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(measure, 900);
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [bk]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Draft overlay — bracket seeding before tournament starts */}
      {t.status === 'setup' && t.players.length >= 2 && (() => {
        const pById = new Map(t.players.map(p => [p.id, p]));
        const allPlaced = t.players.length >= 4 && t.players.every(p => draftSeeds.includes(p.id));

        const slotEl = (idx: number) => {
          const pid = draftSeeds[idx];
          const p = pid ? pById.get(pid) : undefined;
          const isLocked = lockedSlot === idx;
          const isDragging = pid !== null && pid === dragPlayerId;
          return (
            <div
              key={idx}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleSlotDrop(idx)}
              draggable={!!p}
              onDragStart={() => { if (p) setDragPlayerId(p.id); }}
              onDragEnd={() => setDragPlayerId(null)}
              style={{
                width: 160, height: SH, borderRadius: 10, boxSizing: 'border-box' as const,
                border: p
                  ? `1px solid ${isLocked ? 'var(--accent2)' : isDragging ? 'var(--faint)' : 'var(--line2)'}`
                  : '1px dashed color-mix(in srgb,var(--line2) 45%,transparent)',
                background: p ? 'var(--panel)' : 'color-mix(in srgb,var(--bg2) 60%,transparent)',
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px',
                cursor: p ? 'grab' : 'default',
                opacity: isDragging ? 0.3 : 1,
                animation: isLocked ? 'slot-lock 0.65s ease' : 'none',
                transition: 'border-color .2s, opacity .15s',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.06em', flexShrink: 0, minWidth: 18 }}>
                #{idx + 1}
              </span>
              {p
                ? <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                : <span style={{ fontSize: 11, color: 'color-mix(in srgb,var(--faint) 55%,transparent)', fontStyle: 'italic' }}>arrastra aquí</span>
              }
            </div>
          );
        };

        const elbow = (side: 'left' | 'right') => (
          <div style={{ width: EW, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ flex: 1, ...(side === 'left'
              ? { borderRight: '2px solid var(--line2)', borderBottom: '2px solid var(--line2)', borderBottomRightRadius: 6 }
              : { borderLeft: '2px solid var(--line2)', borderBottom: '2px solid var(--line2)', borderBottomLeftRadius: 6 }) }} />
            <div style={{ flex: 1, ...(side === 'left'
              ? { borderRight: '2px solid var(--line2)', borderTop: '2px solid var(--line2)', borderTopRightRadius: 6 }
              : { borderLeft: '2px solid var(--line2)', borderTop: '2px solid var(--line2)', borderTopLeftRadius: 6 }) }} />
          </div>
        );

        const matchL = (i1: number, i2: number) => (
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SG }}>{slotEl(i1)}{slotEl(i2)}</div>
            {elbow('left')}
          </div>
        );
        const matchR = (i1: number, i2: number) => (
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {elbow('right')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SG }}>{slotEl(i1)}{slotEl(i2)}</div>
          </div>
        );

        return (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 24, padding: '20px 40px', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 800,
                background: 'linear-gradient(90deg,#b8860b,#ffd700,#ffe87c,#ffd700,#b8860b)',
                backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite', marginBottom: 6,
              }}>
                春夏秋冬 · {t.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Arrastra tu nombre al lugar del bracket · Suelta para fijar
              </div>
            </div>

            {/* Floating player cards */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 780 }}>
              {t.players.map((p, i) => {
                const placed = draftSeeds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => { setDragPlayerId(p.id); setDragFromSlot(null); }}
                    onDragEnd={() => { setDragPlayerId(null); setDragFromSlot(null); }}
                    style={{
                      padding: '9px 16px', borderRadius: 12,
                      border: '1px solid var(--line2)',
                      background: placed ? 'color-mix(in srgb,var(--panel) 35%,transparent)' : 'var(--panel)',
                      cursor: 'grab',
                      animation: `draft-float ${2.4 + i * 0.3}s ease-in-out infinite`,
                      fontFamily: 'var(--serif)', fontSize: 14,
                      fontWeight: placed ? 400 : 700,
                      color: placed ? 'var(--faint)' : 'var(--ink)',
                      userSelect: 'none', opacity: dragPlayerId === p.id ? 0.35 : 1,
                      transition: 'all .2s',
                    }}
                  >
                    {p.name}
                  </div>
                );
              })}
            </div>

            {/* Bracket */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'visible' }}>
              {/* Left bracket column */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: MG }}>
                {matchL(0, 7)}
                {matchL(3, 4)}
                {/* Vertical connector between match elbows */}
                <div style={{ position: 'absolute', right: 0, top: M1M, height: M2M - M1M, width: 2, background: 'var(--line2)', pointerEvents: 'none' }} />
                {/* Arm going right toward center */}
                <div style={{ position: 'absolute', right: -AW, top: CM - 1, width: AW, height: 2, background: 'var(--line2)', pointerEvents: 'none' }} />
              </div>

              {/* Center column — trophy + horizontal connecting line */}
              <div style={{ width: 110, height: TH, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: CM - 1, left: 0, right: 0, height: 2, background: 'var(--line2)' }} />
                <div style={{
                  position: 'absolute', top: CM, left: '50%',
                  transform: 'translate(-50%, -50%)', zIndex: 1,
                  textAlign: 'center', padding: '8px 12px',
                  background: 'var(--bg)',
                  border: '1px solid color-mix(in srgb,var(--accent2) 40%,var(--line2))',
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 26 }}>🏆</div>
                  <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)', marginTop: 3 }}>
                    Final
                  </div>
                </div>
              </div>

              {/* Right bracket column */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: MG }}>
                {matchR(1, 6)}
                {matchR(2, 5)}
                {/* Vertical connector between match elbows */}
                <div style={{ position: 'absolute', left: 0, top: M1M, height: M2M - M1M, width: 2, background: 'var(--line2)', pointerEvents: 'none' }} />
                {/* Arm going left toward center */}
                <div style={{ position: 'absolute', left: -AW, top: CM - 1, width: AW, height: 2, background: 'var(--line2)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {allPlaced && (
                <button
                  onClick={handleDraftStart}
                  style={{
                    padding: '13px 36px', borderRadius: 12, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 15, fontWeight: 900, letterSpacing: '.1em', cursor: 'pointer',
                    boxShadow: '0 0 22px color-mix(in srgb,var(--accent) 50%,transparent)',
                    animation: 'glow-pulse 2s ease-in-out infinite',
                  }}
                >
                  INICIAR TORNEO →
                </button>
              )}
              {!allPlaced && t.players.length >= 4 && (
                <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.06em' }}>
                  Coloca a todos los jugadores para iniciar
                </div>
              )}
              <div style={{ fontSize: 10, color: 'color-mix(in srgb,var(--faint) 60%,transparent)', letterSpacing: '.06em' }}>
                Se bloquea al iniciar la primera ronda
              </div>
            </div>
          </div>
        );
      })()}

      {t.status !== 'running' || !bk ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--faint)',
            gap: 8,
            height: '100%',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 48,
              color: 'var(--line2)',
              letterSpacing: 4,
            }}
          >
            春夏秋冬
          </div>
          <p style={{ fontSize: 15, margin: 0 }}>El torneo aún no ha comenzado.</p>
        </div>
      ) : (
        (() => {
          const pmap = Object.fromEntries(t.players.map((p) => [p.id, p]));
          const champId = champion(bk);
          const champName = champId ? (pmap[champId]?.name ?? null) : null;
          const gf1 = bk.matches['GF-1'];
          const gf2 = bk.matches['GF-2'];
          const showGF2 = gf2?.needed === true;

          return (
            <div
              ref={innerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 1850,
                marginLeft: -925,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                padding: '14px 4px',
              }}
            >
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

              {/* Main grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 26,
                  alignItems: 'start',
                }}
              >
                {/* Left column: WB + LB */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <BracketSection
                    bk={bk}
                    pmap={pmap}
                    rounds={bk.wb}
                    getRoundLabel={wbRoundLabel}
                    barColor="var(--accent2)"
                    title="Winners Bracket"
                    kanji="勝者"
                    minCardHeight={470}
                  />
                  <BracketSection
                    bk={bk}
                    pmap={pmap}
                    rounds={bk.lb}
                    getRoundLabel={(i) => lbRoundLabel(i)}
                    barColor="var(--dim)"
                    title="Losers Bracket"
                    kanji="敗者"
                    minCardHeight={300}
                  />
                </div>

                {/* Right column: Champion + Gran Final */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 16,
                    minWidth: 230,
                    alignSelf: 'stretch',
                  }}
                >
                  {/* Champion card — always rendered, faded if no champion yet */}
                  <div
                    style={{
                      background:
                        'linear-gradient(150deg,color-mix(in srgb,var(--accent2) 16%,var(--panel)),var(--panel))',
                      border:
                        '1px solid color-mix(in srgb,var(--accent2) 40%,var(--line))',
                      borderRadius: 16,
                      padding: 18,
                      textAlign: 'center',
                      opacity: champId ? 1 : 0.45,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--accent2)',
                        marginBottom: 4,
                      }}
                    >
                      Campeón 優勝
                    </div>
                    <div style={{ fontSize: 34, margin: '4px 0' }}>🏆</div>
                    <div
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 23,
                        fontWeight: 800,
                        lineHeight: 1.15,
                        color: 'var(--accent2)',
                      }}
                    >
                      {champName ?? 'Por definir'}
                    </div>
                  </div>

                  {/* Gran Final section */}
                  <div
                    style={{
                      background: 'color-mix(in srgb,var(--panel) 55%,transparent)',
                      border: '1px solid var(--line)',
                      borderRadius: 14,
                      padding: '13px 14px',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 16,
                          background: 'var(--accent)',
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                      <h3
                        style={{
                          margin: 0,
                          fontFamily: 'var(--serif)',
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        Gran Final
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {gf1 && <MatchCard match={gf1} players={pmap} topLabel="GF-1" />}
                      {showGF2 && gf2 && (
                        <MatchCard match={gf2} players={pmap} topLabel="GF-2" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
            </div>
          );
        })()
      )}
    </div>
  );
}
