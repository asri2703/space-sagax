// Hero illustration — a fun SVG sticker collage representing the
// Saga X Space hall. Used on the right side of the hero.
//
// We layer:
//   - A blob-masked "hall" (rounded rectangle with a window pattern)
//   - A few floating stickers: a balloon, a gift, a star, a person
//   - A confetti scatter
//
// The whole composition is pure SVG so it ships inline and never
// hits the network.

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 480"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-label="Saga X Space — a bright hall with confetti"
      role="img"
    >
      {/* Blob-masked hall background */}
      <defs>
        <clipPath id="hall-blob">
          <path d="M80 40 Q 20 60 24 140 Q 12 220 50 300 Q 80 400 180 420 Q 280 440 360 380 Q 440 320 444 220 Q 460 100 380 50 Q 280 0 180 8 Q 110 16 80 40 Z" />
        </clipPath>
        <linearGradient id="hall-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="100%" stopColor="#FFFAEB" />
        </linearGradient>
      </defs>

      <g clipPath="url(#hall-blob)">
        <rect x="0" y="0" width="480" height="480" fill="url(#hall-sky)" />

        {/* Dot pattern background inside the blob */}
        <g opacity="0.25">
          {Array.from({ length: 18 }).map((_, r) =>
            Array.from({ length: 18 }).map((_, c) => (
              <circle
                key={`${r}-${c}`}
                cx={20 + c * 26}
                cy={20 + r * 26}
                r={1.4}
                fill="#1E293B"
              />
            ))
          )}
        </g>

        {/* Hall building */}
        <g>
          {/* Roof */}
          <path
            d="M 100 200 L 240 100 L 380 200 L 380 220 L 100 220 Z"
            fill="#8B5CF6"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Body */}
          <rect
            x="120"
            y="220"
            width="240"
            height="180"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="3"
            rx="6"
          />
          {/* Door */}
          <rect
            x="220"
            y="290"
            width="40"
            height="110"
            fill="#FBBF24"
            stroke="#1E293B"
            strokeWidth="3"
            rx="3"
          />
          <circle cx="252" cy="345" r="2" fill="#1E293B" />
          {/* Windows (left + right) */}
          <rect
            x="140"
            y="250"
            width="60"
            height="60"
            fill="#F472B6"
            stroke="#1E293B"
            strokeWidth="3"
            rx="4"
          />
          <path
            d="M 170 250 L 170 310 M 140 280 L 200 280"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <rect
            x="280"
            y="250"
            width="60"
            height="60"
            fill="#F472B6"
            stroke="#1E293B"
            strokeWidth="3"
            rx="4"
          />
          <path
            d="M 310 250 L 310 310 M 280 280 L 340 280"
            stroke="#1E293B"
            strokeWidth="3"
          />
          {/* Sign on the roof */}
          <rect
            x="200"
            y="170"
            width="80"
            height="26"
            fill="#FFFDF5"
            stroke="#1E293B"
            strokeWidth="3"
            rx="4"
          />
          <text
            x="240"
            y="188"
            textAnchor="middle"
            fontFamily="var(--font-display), system-ui, sans-serif"
            fontWeight="800"
            fontSize="13"
            fill="#1E293B"
          >
            SAGA X
          </text>
        </g>

        {/* Ground */}
        <rect x="0" y="400" width="480" height="80" fill="#34D399" />
        <path d="M 0 400 L 480 400" stroke="#1E293B" strokeWidth="3" />

        {/* Trees */}
        <g>
          <rect x="60" y="370" width="10" height="40" fill="#1E293B" />
          <circle cx="65" cy="360" r="22" fill="#34D399" stroke="#1E293B" strokeWidth="3" />
          <rect x="410" y="370" width="10" height="40" fill="#1E293B" />
          <circle cx="415" cy="360" r="22" fill="#34D399" stroke="#1E293B" strokeWidth="3" />
        </g>
      </g>

      {/* Outline of the blob for definition */}
      <path
        d="M 80 40 Q 20 60 24 140 Q 12 220 50 300 Q 80 400 180 420 Q 280 440 360 380 Q 440 320 444 220 Q 460 100 380 50 Q 280 0 180 8 Q 110 16 80 40 Z"
        fill="none"
        stroke="#1E293B"
        strokeWidth="4"
      />

      {/* Stickers floating on top */}
      <Balloon cx={60} cy={80} color="#F472B6" />
      <Balloon cx={420} cy={110} color="#8B5CF6" />
      <Balloon cx={380} cy={50} color="#FBBF24" />

      {/* Star sticker top-right */}
      <g transform="translate(440 220) rotate(15)">
        <path
          d="M 0 -22 L 6 -7 L 22 -5 L 10 5 L 14 21 L 0 12 L -14 21 L -10 5 L -22 -5 L -6 -7 Z"
          fill="#FBBF24"
          stroke="#1E293B"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      {/* Gift sticker bottom-left */}
      <g transform="translate(40 380) rotate(-12)">
        <rect x="-18" y="-18" width="36" height="36" fill="#F472B6" stroke="#1E293B" strokeWidth="3" rx="2" />
        <rect x="-4" y="-18" width="8" height="36" fill="#FBBF24" stroke="#1E293B" strokeWidth="2" />
        <path
          d="M -10 -18 Q -10 -28 0 -28 Q 10 -28 10 -18"
          fill="none"
          stroke="#1E293B"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Confetti scatter */}
      <g>
        <circle cx="160" cy="60" r="6" fill="#8B5CF6" stroke="#1E293B" strokeWidth="2" />
        <rect
          x="300"
          y="200"
          width="12"
          height="12"
          fill="#34D399"
          stroke="#1E293B"
          strokeWidth="2"
          transform="rotate(20 306 206)"
        />
        <path
          d="M 100 280 L 110 290 L 100 300 L 90 290 Z"
          fill="#FBBF24"
          stroke="#1E293B"
          strokeWidth="2"
        />
        <path
          d="M 350 320 q 4 -6 8 0 t 8 0"
          fill="none"
          stroke="#F472B6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="220" cy="60" r="4" fill="#F472B6" />
        <circle cx="80" cy="180" r="4" fill="#34D399" />
      </g>
    </svg>
  );
}

function Balloon({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="16" ry="20" fill={color} stroke="#1E293B" strokeWidth="3" />
      <path
        d={`M ${cx} ${cy + 20} L ${cx - 3} ${cy + 32} L ${cx + 3} ${cy + 32} Z`}
        fill={color}
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={`M ${cx} ${cy + 32} Q ${cx + 8} ${cy + 60} ${cx} ${cy + 90}`}
        fill="none"
        stroke="#1E293B"
        strokeWidth="1.5"
      />
    </g>
  );
}
