import type { Theme } from '../types';

type Screen = 'setup' | 'judge' | 'tv';

type Props = {
  screen: Screen;
  onNav: (s: Screen) => void;
  theme: Theme;
  onToggleTheme: () => void;
};

const NAV_TABS: { id: Screen; label: string }[] = [
  { id: 'setup', label: 'Inscripción' },
  { id: 'judge', label: 'Juez' },
  { id: 'tv', label: 'Torneo · TV' },
];

export default function Header({ screen, onNav, theme, onToggleTheme }: Props) {
  const themeLabel = theme === 'dotonbori' ? 'Dotonbori' : '4 Estaciones';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '11px clamp(13px,3vw,26px)',
      background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Shippori Mincho', serif",
          fontWeight: 800,
          fontSize: 20,
          letterSpacing: 3,
          color: 'var(--accent2)',
          lineHeight: 1,
        }}>
          春夏秋冬
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'Shippori Mincho', serif",
            fontWeight: 700,
            fontSize: 'clamp(14px,2vw,19px)',
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Shunka Shūtō no Kessen
          </div>
          <div style={{
            fontSize: 10.5,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: 'var(--dim)',
          }}>
            Kids Stop · Torneo de las 4 Estaciones
          </div>
        </div>
      </div>

      <nav style={{
        display: 'flex',
        gap: 4,
        marginLeft: 'auto',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 4,
      }}>
        {NAV_TABS.map(tab => {
          const active = screen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNav(tab.id)}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 7,
                padding: '6px 14px',
                fontSize: 13.5,
                fontWeight: active ? 700 : 400,
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accentInk)' : 'var(--dim)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onToggleTheme}
        title="Cambiar look"
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: 10,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          color: 'var(--dim)',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          flexShrink: 0,
        }}
      >
        <span style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        ⚙ {themeLabel}
      </button>
    </header>
  );
}
