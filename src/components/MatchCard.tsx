import type { Match, Player } from '../types';
import { wins } from '../engine/bracket';

type Props = {
  match: Match;
  players: Record<string, Player>;
  topLabel?: string;
  bottomLabel?: string;
};

const scoreStyle: React.CSSProperties = {
  fontFamily: "'Shippori Mincho', serif",
  fontSize: 16,
  fontWeight: 800,
  minWidth: 12,
  textAlign: 'right',
  color: 'var(--accent2)',
};

export default function MatchCard({ match, players, topLabel, bottomLabel }: Props) {
  const { p1, p2, status } = match;
  const [s1, s2] = wins(match);

  const pending = p1 === null && p2 === null;
  const isLive = status === 'banning' || status === 'playing';

  function playerName(pid: string | 'BYE' | null): string {
    if (!pid) return 'Por definir';
    if (pid === 'BYE') return 'BYE';
    return players[pid]?.name ?? 'Por definir';
  }

  function rowStyle(side: 'p1' | 'p2'): React.CSSProperties {
    const pid = side === 'p1' ? p1 : p2;
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 13,
      overflow: 'hidden',
    };
    if (pending) {
      return { ...base, fontStyle: 'italic', color: 'var(--faint)' };
    }
    if (pid === 'BYE') {
      return { ...base, fontStyle: 'italic', color: 'var(--faint)' };
    }
    if (status === 'done') {
      const isWinner = match.winner === pid;
      if (isWinner) {
        return { ...base, color: 'var(--accent2)', fontWeight: 800 };
      } else {
        return { ...base, color: 'var(--faint)', textDecoration: 'line-through' };
      }
    }
    return base;
  }

  const cardBorder = isLive
    ? '1px solid var(--accent)'
    : '1px solid var(--line)';

  const cardShadow = isLive
    ? '0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent), 0 4px 16px color-mix(in srgb,var(--accent) 22%,transparent)'
    : undefined;

  const p1Name = pending ? 'Por definir' : playerName(p1);
  const p2Name = pending ? 'Por definir' : playerName(p2);

  const p1IsBye = p1 === 'BYE';
  const p2IsBye = p2 === 'BYE';

  return (
    <div style={{
      width: 160,
      borderRadius: 11,
      background: 'var(--panel2)',
      padding: '10px 12px',
      border: cardBorder,
      boxShadow: cardShadow,
      opacity: pending ? 0.45 : 1,
    }}>
      {topLabel && (
        <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {topLabel}
        </div>
      )}
      <div style={rowStyle('p1')}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p1IsBye ? <em>BYE</em> : p1Name}
        </span>
        {!pending && <span style={scoreStyle}>{s1}</span>}
      </div>
      <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
      <div style={rowStyle('p2')}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p2IsBye ? <em>BYE</em> : p2Name}
        </span>
        {!pending && <span style={scoreStyle}>{s2}</span>}
      </div>
      {bottomLabel && (
        <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {bottomLabel}
        </div>
      )}
    </div>
  );
}
