// Infinite-scrolling marquee band. Items are duplicated to make
// the loop seamless.

type Props = {
  items: string[];
  bg?: "yellow" | "violet" | "pink" | "mint";
  rotate?: number; // degrees
};

export function Marquee({ items, bg = "yellow", rotate = -1.5 }: Props) {
  const bgVar = {
    yellow: "var(--tertiary)",
    violet: "var(--accent)",
    pink: "var(--secondary)",
    mint: "var(--quaternary)",
  }[bg];
  // Duplicate items so the track is twice the visible width
  const all = [...items, ...items];
  return (
    <div
      className="marquee"
      style={{
        background: bgVar,
        transform: `rotate(${rotate}deg)`,
        color: bg === "violet" || bg === "pink" ? "white" : "var(--fg)",
      }}
    >
      <div className="marquee-track" aria-hidden>
        {all.map((it, i) => (
          <span key={i} className="marquee-item">
            {it}
            <span className="marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
