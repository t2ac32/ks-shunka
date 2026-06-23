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
