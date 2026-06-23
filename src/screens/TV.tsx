import { useRef, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournament';
import { champion } from '../engine/bracket';
import MatchCard from '../components/MatchCard';
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
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--faint)',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: 8,
                height: 14,
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

  if (t.status !== 'running' || !bk) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--faint)',
          gap: 8,
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
    );
  }

  const pmap = Object.fromEntries(t.players.map((p) => [p.id, p]));
  const champId = champion(bk);
  const champName = champId ? (pmap[champId]?.name ?? null) : null;
  const gf1 = bk.matches['GF-1'];
  const gf2 = bk.matches['GF-2'];
  const showGF2 = gf2?.needed === true;

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 10,
            padding: '0 6px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: 5,
              color: 'var(--accent2)',
            }}
          >
            春夏秋冬
          </span>
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 700,
              fontSize: 21,
              color: 'var(--ink)',
            }}
          >
            {t.name}
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: 'var(--dim)',
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)',
                }}
              />
              En juego
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: 'var(--dim)',
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: 'var(--accent2)',
                }}
              />
              Ganador
            </span>
          </span>
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
      </div>
    </div>
  );
}
