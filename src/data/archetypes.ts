import type { DeckRef } from '../types';

export type Archetype = {
  id: string;
  name: string;
  color: string;
  sprites: string[];
};

const SPRITE_BASE = `${import.meta.env.BASE_URL ?? '/'}sprites`;

function spritePath(name: string): string {
  return `${SPRITE_BASE}/${name}.png`;
}

export const ARCHETYPES: Archetype[] = [
  { id: 'dragapult',          name: 'Dragapult ex',                color: '#9c5bd0', sprites: ['dragapult'] },
  { id: 'ns-zoroark',         name: "N's Zoroark ex",              color: '#6e4a73', sprites: ['zoroark'] },
  { id: 'crustle',            name: 'Crustle Mysterious Rock Inn', color: '#b07050', sprites: ['crustle'] },
  { id: 'slowking',           name: 'Slowking Seek Inspiration',   color: '#d896c0', sprites: ['slowking'] },
  { id: 'hydrapple',          name: 'Hydrapple ex',                color: '#7dc775', sprites: ['hydrapple'] },
  { id: 'alakazam',           name: 'Alakazam Powerful Hand',      color: '#b48a5c', sprites: ['alakazam'] },
  { id: 'raging-bolt',        name: 'Raging Bolt ex',              color: '#d2a72b', sprites: ['raging-bolt'] },
  { id: 'ogerpon-box',        name: 'Ogerpon Box',                 color: '#4aa872', sprites: ['ogerpon', 'ogerpon-wellspring'] },
  { id: 'lillies-clefairy',   name: "Lillie's Clefairy ex",        color: '#f0b5d2', sprites: ['clefairy'] },
  { id: 'rockets-honchkrow',  name: "Rocket's Honchkrow",          color: '#4a4a55', sprites: ['honchkrow', 'porygon2'] },
  { id: 'festival-lead',      name: 'Festival Lead',               color: '#a8c574', sprites: ['dipplin', 'thwackey'] },
  { id: 'mega-lucario',       name: 'Mega Lucario ex',             color: '#4a82c0', sprites: ['lucario-mega'] },
  { id: 'rockets-mewtwo',     name: "Rocket's Mewtwo ex",          color: '#9c7fb5', sprites: ['mewtwo', 'spidops'] },
  { id: 'hops-trevenant',     name: "Hop's Trevenant",             color: '#8a6a45', sprites: ['trevenant'] },
  { id: 'beedrill',           name: 'Beedrill ex',                 color: '#d2b545', sprites: ['beedrill'] },
  { id: 'ethans-typhlosion',  name: "Ethan's Typhlosion",          color: '#d27545', sprites: ['typhlosion'] },
  { id: 'cynthias-garchomp',  name: "Cynthia's Garchomp ex",       color: '#4a85a0', sprites: ['garchomp'] },
  { id: 'metagross',          name: 'Metagross Metal Maker',       color: '#7090b5', sprites: ['metagross'] },
  { id: 'mega-lopunny',       name: 'Mega Lopunny ex',             color: '#c89880', sprites: ['lopunny-mega'] },
  { id: 'marnies-grimmsnarl', name: "Marnie's Grimmsnarl ex",      color: '#6a5a8a', sprites: ['grimmsnarl'] },
  { id: 'mega-starmie',       name: 'Mega Starmie ex',             color: '#c54860', sprites: ['starmie-mega'] },
  { id: 'mega-greninja',      name: 'Mega Greninja ex',            color: '#3a78b5', sprites: ['greninja-mega'] },
  { id: 'ogerpon-meganium',   name: 'Ogerpon Meganium',            color: '#7ab578', sprites: ['ogerpon', 'meganium'] },
  { id: 'sylveon',            name: 'Sylveon Safeguard',           color: '#f0a8c5', sprites: ['sylveon'] },
  { id: 'archaludon',         name: 'Archaludon ex',               color: '#7f8a9a', sprites: ['archaludon'] },
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

export function deckSprites(deck: DeckRef): string[] {
  if (!deck || 'custom' in deck) return [];
  const a = ARCHETYPES.find(a => a.id === deck.id);
  return a ? a.sprites.map(spritePath) : [];
}

export function archetypeSpritePaths(a: Archetype): string[] {
  return a.sprites.map(spritePath);
}
