import { useEffect, useRef, useState } from 'react';
import type { DeckRef } from '../types';
import { ARCHETYPES, archetypeSpritePaths, deckColor, deckSprites } from '../data/archetypes';
import DeckDot from './DeckDot';
import DeckSprites from './DeckSprites';

type Props = {
  value: DeckRef;
  slot: number;
  onChange: (v: DeckRef) => void;
};

export default function DeckPicker({ value, slot, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const color = deckColor(value);
  const sprites = deckSprites(value);
  const selectedName =
    !value ? null
    : 'custom' in value ? value.name
    : ARCHETYPES.find(a => a.id === value.id)?.name ?? value.id;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickArchetype(id: string) {
    setShowCustom(false);
    setOpen(false);
    onChange({ id });
  }

  function startCustom() {
    setOpen(false);
    setCustomName('');
    setShowCustom(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function clear() {
    setOpen(false);
    setShowCustom(false);
    onChange(null);
  }

  function commitCustom() {
    const trimmed = customName.trim();
    if (trimmed) onChange({ custom: true, name: trimmed });
    setShowCustom(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitCustom();
    else if (e.key === 'Escape') setShowCustom(false);
  }

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 9,
          padding: '6px 10px 6px 8px',
          height: 46,
          width: '100%',
          color: 'var(--ink)',
          fontSize: 13.5,
          textAlign: 'left',
        }}
      >
        <DeckDot color={color} />
        {sprites.length > 0 && <DeckSprites paths={sprites} size={28} />}
        <span style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: selectedName ? 'var(--ink)' : 'var(--dim)',
        }}>
          {selectedName ?? `Mazo ${slot + 1}…`}
        </span>
        <span style={{ color: 'var(--dim)', fontSize: 11, marginLeft: 4 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 340,
            overflowY: 'auto',
            background: 'var(--panel2)',
            border: '1px solid var(--line2)',
            borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,.45)',
            padding: 4,
          }}
        >
          {value && (
            <button
              type="button"
              onClick={clear}
              style={optionStyle(false, 'var(--dim)')}
            >
              <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>✕</span>
              <span>Quitar selección</span>
            </button>
          )}
          {ARCHETYPES.map(a => {
            const selected = value && !('custom' in value) && value.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={!!selected}
                onClick={() => pickArchetype(a.id)}
                style={optionStyle(!!selected)}
              >
                <DeckSprites paths={archetypeSpritePaths(a)} size={28} />
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{a.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={startCustom}
            style={optionStyle(false, 'var(--dim)')}
          >
            <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>✎</span>
            <span>Personalizado…</span>
          </button>
        </div>
      )}

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

function optionStyle(selected: boolean, color?: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '6px 8px',
    borderRadius: 7,
    border: 'none',
    background: selected ? 'var(--panel)' : 'transparent',
    color: color ?? 'var(--ink)',
    fontSize: 13.5,
    textAlign: 'left',
    minHeight: 40,
  };
}
