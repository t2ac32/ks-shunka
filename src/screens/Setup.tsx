import { useRef, useState } from 'react';
import { useTournamentStore } from '../store/tournament';
import DeckPicker from '../components/DeckPicker';
import { ARCHETYPES } from '../data/archetypes';
import { supabase } from '../lib/supabase';
import type { DeckRef, Player, Tournament } from '../types';

const MOCK_NAMES = ['Aoi', 'Hana', 'Kaito', 'Ren', 'Sora', 'Yuki', 'Mika', 'Taro'];

function generateMock(loadFromJSON: (data: Tournament) => void) {
  const current = useTournamentStore.getState().t;
  const mockPlayers: Player[] = MOCK_NAMES.map(name => {
    const shuffled = [...ARCHETYPES].sort(() => Math.random() - 0.5);
    const decks: [DeckRef, DeckRef, DeckRef, DeckRef] = [
      { id: shuffled[0].id },
      { id: shuffled[1].id },
      { id: shuffled[2].id },
      { id: shuffled[3].id },
    ];
    return {
      id: 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2),
      name,
      decks,
    };
  });
  loadFromJSON({ ...current, players: mockPlayers, status: 'setup' });
}

export default function Setup() {
  const store = useTournamentStore();
  const { t } = store;

  const [newName, setNewName] = useState('');
  const [startError, setStartError] = useState('');
  const [loadMsg, setLoadMsg] = useState('');
  const [loadBusy, setLoadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readyCount = t.players.filter(p => p.decks.every(d => d !== null)).length;

  function handleStart() {
    setStartError('');
    if (t.players.length < 4) {
      setStartError('Se necesitan al menos 4 jugadores.');
      return;
    }
    const incomplete = t.players.filter(p => !p.decks.every(d => d !== null));
    if (incomplete.length > 0) {
      const ok = window.confirm(
        `${incomplete.length} jugador(es) tienen menos de 4 mazos registrados. ¿Deseas continuar de todas formas?`
      );
      if (!ok) return;
    }
    store.startTournament();
  }

  function handleAddPlayer() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    store.addPlayer(trimmed);
    setNewName('');
  }

  function handleNewKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddPlayer();
  }

  async function handleLoadRegistrations() {
    if (!t.registrationCode) return;
    setLoadBusy(true);
    const result = await store.loadRegistrations(t.registrationCode);
    setLoadBusy(false);
    setLoadMsg(`Se cargaron ${result.loaded} de ${result.count} registros.`);
    setTimeout(() => setLoadMsg(''), 4000);
  }

  async function handleCodeChange(code: string) {
    store.setRegistrationCode(code);
    if (code) {
      await supabase.from('tournaments').upsert({ code, name: t.name }, { onConflict: 'code' });
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        store.loadFromJSON(data);
      } catch {
        alert('Archivo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleWipe() {
    if (window.confirm('¿Reiniciar todo el torneo? Esta acción no se puede deshacer.')) {
      store.wipe();
    }
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 780,
    margin: '0 auto',
    padding: '0 16px 32px',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--panel)',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    border: '1px solid var(--line)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    background: 'var(--bg2)',
    color: 'var(--ink)',
    fontSize: 16,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--dim)',
    marginBottom: 6,
  };

  const smallBtnStyle: React.CSSProperties = {
    height: 37,
    padding: '0 13px',
    borderRadius: 9,
    border: '1px solid var(--line)',
    background: 'var(--panel2)',
    color: 'var(--dim)',
    fontSize: 12.5,
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 7, height: 18, background: 'var(--accent)', borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700 }}>
            Configuración
          </h2>
        </div>

        <label style={labelStyle}>Nombre del torneo</label>
        <input
          value={t.name}
          onChange={e => store.setName(e.target.value)}
          placeholder="Nombre del torneo"
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <label style={labelStyle}>Sembrado</label>
            <select
              value={t.seedMode}
              onChange={e => store.setSeedMode(e.target.value as 'random' | 'manual')}
              style={{ ...inputStyle, fontSize: 14 }}
            >
              <option value="random">Aleatorio</option>
              <option value="manual">Manual (orden de lista)</option>
            </select>
          </div>
          <button
            onClick={() => store.shuffle()}
            style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel2)', fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}
          >
            Barajar 🎲
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
          <b style={{ color: 'var(--ink)', fontSize: 22, fontFamily: 'var(--serif)' }}>{t.players.length}</b>
          {' jugadores · '}
          <b style={{ color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 22 }}>{readyCount}</b>
          {' listos'}
        </div>

        <label style={labelStyle}>Código de torneo</label>
        <input
          value={t.registrationCode ?? ''}
          onChange={e => handleCodeChange(e.target.value)}
          placeholder="ej. otono26"
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        {t.registrationCode && (
          <div style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'monospace', marginBottom: 12 }}>
            https://shunka.vercel.app/registro/{t.registrationCode}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <button
            onClick={handleLoadRegistrations}
            disabled={!t.registrationCode || loadBusy}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 9,
              border: '1px solid var(--line)',
              background: 'var(--panel2)',
              color: !t.registrationCode ? 'var(--faint)' : 'var(--ink)',
              fontSize: 13.5,
              cursor: !t.registrationCode ? 'default' : 'pointer',
              opacity: !t.registrationCode ? 0.5 : 1,
            }}
          >
            {loadBusy ? 'Cargando…' : 'Cargar inscritos'}
          </button>
          {loadMsg && (
            <span style={{ fontSize: 13, color: 'var(--good)' }}>{loadMsg}</span>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
          <button
            onClick={t.status === 'running' ? () => {
              if (window.confirm('¿Reiniciar el bracket? Se perderán los resultados actuales.')) {
                store.backToEdit();
              }
            } : handleStart}
            style={{
              background: 'var(--accent2)',
              color: 'var(--accentInk)',
              fontWeight: 700,
              borderRadius: 10,
              padding: '10px 20px',
              border: 'none',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {t.status === 'running' ? 'Reiniciar bracket' : 'Iniciar torneo →'}
          </button>
          {t.status === 'running' && (
            <button
              onClick={() => store.backToEdit()}
              style={{ marginLeft: 10, background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Editar lista
            </button>
          )}
          {startError && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--bad)' }}>{startError}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 9, marginTop: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => store.exportJSON()} style={smallBtnStyle}>
            ⬇ Exportar respaldo
          </button>
          <label style={{ ...smallBtnStyle, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            ⬆ Importar
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={handleWipe}
            style={{ ...smallBtnStyle, background: 'transparent', color: 'var(--faint)' }}
          >
            Reiniciar todo
          </button>
          {t.status === 'setup' && (
            <button
              onClick={() => generateMock(store.loadFromJSON)}
              style={{ ...smallBtnStyle, background: 'transparent', border: '1px dashed var(--accent2)', color: 'var(--accent2)', marginLeft: 'auto' }}
            >
              🧪 Torneo de prueba
            </button>
          )}
        </div>
      </div>

      {t.status === 'setup' && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
            <span style={{ width: 7, height: 18, background: 'var(--accent2)', borderRadius: 2 }} />
            <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700 }}>
              Jugadores y mazos
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleNewKey}
              placeholder="Nombre del jugador"
              style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--bg2)', fontSize: 15, color: 'var(--ink)' }}
            />
            <button
              onClick={handleAddPlayer}
              style={{ height: 46, padding: '0 18px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: 'var(--accentInk)', fontWeight: 700, fontSize: 15, cursor: 'pointer', flexShrink: 0 }}
            >
              Añadir
            </button>
          </div>

          {t.players.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '18px 0' }}>
              Aún no hay jugadores. Añade el primero arriba.
            </p>
          )}

          {t.players.map((p, i) => {
            const filledCount = p.decks.filter(d => d !== null).length;
            const isReady = filledCount === 4;
            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--bg2)',
                  borderRadius: 13,
                  border: `2px solid ${isReady ? 'var(--good)' : 'var(--line)'}`,
                  padding: 13,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'var(--panel2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--dim)',
                    fontFamily: 'var(--serif)',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <input
                    value={p.name}
                    onChange={e => store.renamePlayer(p.id, e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid transparent',
                      background: 'transparent',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  />
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isReady ? 'var(--good)' : 'var(--dim)',
                    flexShrink: 0,
                  }}>
                    {filledCount}/4
                  </span>
                  <button
                    onClick={() => store.removePlayer(p.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      color: 'var(--faint)',
                      fontSize: 15,
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 8,
                  marginTop: 10,
                }}>
                  {([0, 1, 2, 3] as const).map(slot => (
                    <DeckPicker
                      key={slot}
                      slot={slot}
                      value={p.decks[slot]}
                      onChange={v => store.pickDeck(p.id, slot, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {t.status === 'running' && (
        <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, marginTop: 20 }}>
          El torneo está en curso. Ve a <b style={{ color: 'var(--dim)' }}>Juez</b> para registrar resultados o a <b style={{ color: 'var(--dim)' }}>TV</b> para proyectar el bracket.
        </p>
      )}
    </div>
  );
}
