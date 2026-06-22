import type { DeckRef } from '../types';

export type Archetype = { id: string; name: string; color: string };

export const ARCHETYPES: Archetype[] = [
  { id: 'charizard',   name: 'Charizard ex',    color: '#E8503A' },
  { id: 'dragapult',   name: 'Dragapult ex',     color: '#9c5bd0' },
  { id: 'gardevoir',   name: 'Gardevoir ex',     color: '#B45FB0' },
  { id: 'ragingbolt',  name: 'Raging Bolt ex',   color: '#d2a72b' },
  { id: 'gholdengo',   name: 'Gholdengo ex',     color: '#caa23c' },
  { id: 'miraidon',    name: 'Miraidon ex',       color: '#F2C744' },
  { id: 'regidrago',   name: 'Regidrago VSTAR',  color: '#c98a2a' },
  { id: 'lugia',       name: 'Lugia VSTAR',       color: '#cfc7b0' },
  { id: 'lostbox',     name: 'Lost Zone Box',     color: '#4A90D9' },
  { id: 'roaringmoon', name: 'Roaring Moon ex',  color: '#5a5470' },
  { id: 'ironthorns',  name: 'Iron Thorns ex',   color: '#e0c14a' },
  { id: 'terapagos',   name: 'Terapagos ex',     color: '#7fb9c9' },
  { id: 'snorlax',     name: 'Snorlax Stall',    color: '#9aa0a8' },
  { id: 'pidgeot',     name: 'Pidgeot Control',  color: '#b79b6a' },
  { id: 'grimmsnarl',  name: 'Grimmsnarl ex',    color: '#6a5a8a' },
  { id: 'banette',     name: 'Banette ex',        color: '#9b6fb0' },
  { id: 'archaludon',  name: 'Archaludon ex',    color: '#7f8a9a' },
  { id: 'conkeldurr',  name: 'Conkeldurr',        color: '#C0603A' },
];

export const CUSTOM_COLOR = '#8a7d70';
export const EMPTY_COLOR = 'var(--line2)';

export function deckColor(deck: DeckRef): string {
  if (!deck) return EMPTY_COLOR;
  if ('custom' in deck) return CUSTOM_COLOR;
  return ARCHETYPES.find(a => a.id === deck.id)?.color ?? CUSTOM_COLOR;
}

export function deckLabel(deck: DeckRef): string | null {
  if (!deck) return null;
  if ('custom' in deck) return deck.name;
  return ARCHETYPES.find(a => a.id === deck.id)?.name ?? deck.id;
}
