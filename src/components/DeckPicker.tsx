import { useRef, useState } from 'react';
import type { DeckRef } from '../types';
import { ARCHETYPES, deckColor } from '../data/archetypes';
import DeckDot from './DeckDot';

type Props = {
  value: DeckRef;
  slot: number;
  onChange: (v: DeckRef) => void;
};

function selectValue(value: DeckRef): string {
  if (!value) return '';
  if ('custom' in value) return '__custom';
  return value.id;
}

export default function DeckPicker({ value, slot, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const color = deckColor(value);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === '') {
      setShowCustom(false);
      onChange(null);
    } else if (val === '__custom') {
      setCustomName('');
      setShowCustom(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setShowCustom(false);
      onChange({ id: val });
    }
  }

  function commitCustom() {
    const trimmed = customName.trim();
    if (trimmed) {
      onChange({ custom: true, name: trimmed });
    }
    setShowCustom(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitCustom();
    } else if (e.key === 'Escape') {
      setShowCustom(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 9,
        padding: '6px 8px',
      }}>
        <DeckDot color={color} />
        <select
          value={selectValue(value)}
          onChange={handleSelectChange}
          style={{
            flex: 1,
            minWidth: 0,
            height: 34,
            border: 'none',
            background: 'transparent',
            fontSize: 13.5,
            cursor: 'pointer',
            color: 'var(--ink)',
          }}
        >
          <option value="">Mazo {slot + 1}…</option>
          {ARCHETYPES.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
          <option value="__custom">✎ Personalizado…</option>
        </select>
      </div>
      {showCustom && (
        <input
          ref={inputRef}
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={commitCustom}
          placeholder="Nombre del mazo personalizado"
          style={{
            width: '100%',
            height: 38,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--line2)',
            background: 'var(--bg2)',
            fontSize: 13.5,
            color: 'var(--ink)',
          }}
        />
      )}
    </div>
  );
}
