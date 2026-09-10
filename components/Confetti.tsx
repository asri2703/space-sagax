// Small confetti shapes — used as absolute-positioned decoration
// inside hero / section headers. Pure SVG, no JS.
//
// Usage:  <Confetti variant="hero" />

type Variant = "hero" | "section" | "sparse";

const SHAPES = {
  circle: (color: string, size: number, key: string) => (
    <circle key={key} cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
  ),
  triangle: (color: string, size: number, key: string) => (
    <polygon key={key} points={`${size / 2},0 ${size},${size} 0,${size}`} fill={color} />
  ),
  square: (color: string, size: number, key: string) => (
    <rect key={key} x="0" y="0" width={size} height={size} fill={color} transform={`rotate(20 ${size / 2} ${size / 2})`} />
  ),
  squiggle: (color: string, size: number, key: string) => (
    <path
      key={key}
      d={`M 0 ${size / 2} Q ${size / 4} 0 ${size / 2} ${size / 2} T ${size} ${size / 2}`}
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  ),
  cross: (color: string, size: number, key: string) => (
    <path
      key={key}
      d={`M ${size / 2} 0 L ${size / 2} ${size} M 0 ${size / 2} L ${size} ${size / 2}`}
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
};

const COLORS = ["#8B5CF6", "#F472B6", "#FBBF24", "#34D399"];

const SHAPE_NAMES = ["circle", "triangle", "square", "squiggle", "cross"] as const;

type Shape = (typeof SHAPE_NAMES)[number];

const PRESETS: Record<Variant, Array<{ x: string; y: string; size: number; shape: Shape; color: string; rot: number }>> = {
  hero: [
    { x: "8%", y: "12%", size: 28, shape: "circle", color: COLORS[2], rot: 0 },
    { x: "92%", y: "20%", size: 22, shape: "triangle", color: COLORS[1], rot: 12 },
    { x: "82%", y: "8%", size: 18, shape: "cross", color: COLORS[0], rot: 0 },
    { x: "16%", y: "78%", size: 24, shape: "square", color: COLORS[3], rot: 22 },
    { x: "78%", y: "62%", size: 16, shape: "circle", color: COLORS[0], rot: 0 },
    { x: "10%", y: "44%", size: 14, shape: "squiggle", color: COLORS[1], rot: -10 },
    { x: "94%", y: "82%", size: 20, shape: "squiggle", color: COLORS[3], rot: 6 },
    { x: "4%", y: "26%", size: 12, shape: "triangle", color: COLORS[2], rot: 18 },
  ],
  section: [
    { x: "6%", y: "30%", size: 16, shape: "circle", color: COLORS[2], rot: 0 },
    { x: "94%", y: "60%", size: 18, shape: "triangle", color: COLORS[1], rot: 0 },
    { x: "50%", y: "10%", size: 14, shape: "cross", color: COLORS[0], rot: 0 },
  ],
  sparse: [
    { x: "12%", y: "40%", size: 18, shape: "circle", color: COLORS[2], rot: 0 },
    { x: "88%", y: "70%", size: 14, shape: "triangle", color: COLORS[1], rot: 0 },
  ],
};

export function Confetti({ variant = "section" }: { variant?: Variant }) {
  const items = PRESETS[variant];
  return (
    <div className="confetti" aria-hidden style={{ inset: 0 }} key={variant}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: it.x,
            top: it.y,
            width: it.size,
            height: it.size,
            transform: `rotate(${it.rot}deg)`,
          }}
        >
          <svg width={it.size} height={it.size} viewBox={`0 0 ${it.size} ${it.size}`} xmlns="http://www.w3.org/2000/svg">
            {SHAPES[it.shape](it.color, it.size, `c-${i}`)}
          </svg>
        </div>
      ))}
    </div>
  );
}
