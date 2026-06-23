import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { DeckRef } from '../types';
import { deckColor, deckLabel } from '../data/archetypes';
import DeckPicker from '../components/DeckPicker';
import DeckDot from '../components/DeckDot';
import { supabase } from '../lib/supabase';

const EMPTY_DECKS: [DeckRef, DeckRef, DeckRef, DeckRef] = [null, null, null, null];

export default function Register() {
  const { code } = useParams<{ code: string }>();

  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [decks, setDecks] = useState<[DeckRef, DeckRef, DeckRef, DeckRef]>(EMPTY_DECKS);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .from('tournaments')
      .select('name')
      .eq('code', code)
      .single()
      .then(({ data }) => {
        setTournamentName(data?.name ?? null);
      });
  }, [code]);

  function setDeck(index: number, value: DeckRef) {
    setDecks(prev => {
      const next: [DeckRef, DeckRef, DeckRef, DeckRef] = [...prev] as [DeckRef, DeckRef, DeckRef, DeckRef];
      next[index] = value;
      return next;
    });
  }

  const allFilled = decks.every(d => d !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: sbErr } = await supabase.from('registrations').upsert(
      {
        tournament_code: code,
        full_name: fullName.trim(),
        nickname: nickname.trim() || null,
        decks,
        status: 'pending',
      },
      { onConflict: 'tournament_code,full_name' }
    );

    if (sbErr) {
      setError(sbErr.message);
      setLoading(false);
    } else {
      setSubmitted(true);
      setLoading(false);
      setEditing(false);
    }
  }

  function handleModify() {
    setEditing(true);
    setSubmitted(false);
  }

  const showSuccess = submitted && !editing;

  return (
    <div data-theme="lantern" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontFamily: 'serif',
            fontSize: 13,
            color: 'var(--faint)',
            letterSpacing: '0.2em',
            marginBottom: 8,
          }}>
            春夏秋冬
          </div>
          <h1 style={{
            fontFamily: 'serif',
            fontSize: 26,
            color: 'var(--accent2)',
            fontWeight: 600,
            marginBottom: 6,
          }}>
            {tournamentName ?? 'Registro de Jugadores'}
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--dim)',
            margin: 0,
          }}>
            Kids Stop · Torneo de las 4 Estaciones
          </p>
        </div>

        {/* Success card */}
        {showSuccess && (
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--good)',
            borderRadius: 16,
            padding: '24px 20px',
            marginBottom: 20,
            animation: 'pop .2s ease',
          }}>
            <div style={{
              fontSize: 16,
              color: 'var(--good)',
              fontWeight: 600,
              marginBottom: 12,
            }}>
              ✓ Tu registro fue enviado.
            </div>
            <div style={{
              fontSize: 15,
              color: 'var(--ink)',
              marginBottom: 4,
            }}>
              {fullName.trim()}
              {nickname.trim() && (
                <span style={{ color: 'var(--dim)', fontSize: 13, marginLeft: 6 }}>
                  ({nickname.trim()})
                </span>
              )}
            </div>

            {/* Deck summary */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {decks.map((deck, i) => {
                const label = deckLabel(deck);
                return (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <DeckDot color={deckColor(deck)} size={18} />
                    <span style={{
                      fontSize: 11,
                      color: 'var(--dim)',
                      textAlign: 'center',
                      maxWidth: 72,
                      lineHeight: 1.2,
                    }}>
                      {label ?? `Mazo ${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleModify}
              style={{
                marginTop: 20,
                padding: '8px 18px',
                borderRadius: 9,
                border: '1px solid var(--line2)',
                background: 'var(--panel2)',
                color: 'var(--ink)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Modificar registro
            </button>
          </div>
        )}

        {/* Form card */}
        {!showSuccess && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--panel)',
              borderRadius: 16,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Full name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 500 }}>
                Nombre completo <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 9,
                  border: '1px solid var(--line2)',
                  background: 'var(--bg2)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Nickname */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 500 }}>
                Apodo / Nick{' '}
                <span style={{ color: 'var(--faint)', fontSize: 12 }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Como te conocen en el club"
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 9,
                  border: '1px solid var(--line2)',
                  background: 'var(--bg2)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Deck slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 500 }}>
                Mazos
              </div>
              {([0, 1, 2, 3] as const).map(i => (
                <div key={i}>
                  <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 4 }}>
                    Mazo {i + 1}
                  </div>
                  <DeckPicker
                    slot={i}
                    value={decks[i]}
                    onChange={v => setDeck(i, v)}
                  />
                </div>
              ))}
              {!allFilled && (
                <p style={{ fontSize: 12, color: 'var(--dim)', margin: 0 }}>
                  Tener 4 mazos es obligatorio para participar.
                </p>
              )}
            </div>

            {/* Error */}
            {error !== null && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--bad)' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent2)',
                color: 'var(--accentInk)',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity .15s',
              }}
            >
              {loading ? 'Enviando…' : 'Confirmar registro'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
