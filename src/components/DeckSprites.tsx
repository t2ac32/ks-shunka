type Props = { paths: string[]; size?: number };

export default function DeckSprites({ paths, size = 24 }: Props) {
  if (paths.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      {paths.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            marginLeft: i === 0 ? 0 : -size * 0.35,
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))',
          }}
        />
      ))}
    </span>
  );
}
