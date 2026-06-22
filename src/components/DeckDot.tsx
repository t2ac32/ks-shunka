type Props = { color: string; size?: number };

export default function DeckDot({ color, size = 22 }: Props) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      border: '1px solid rgba(255,255,255,.18)',
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.15)',
      flexShrink: 0,
    }} />
  );
}
