// Squiggle divider — used between sections or as a flourish
// under headings.

type Props = {
  color?: "fg" | "violet" | "pink" | "mint" | "yellow";
  className?: string;
};

const STROKE = {
  fg: "#1E293B",
  violet: "#8B5CF6",
  pink: "#F472B6",
  mint: "#34D399",
  yellow: "#FBBF24",
};

export function Squiggle({ color = "fg", className = "" }: Props) {
  return (
    <svg
      className={`squiggle-divider ${className}`}
      viewBox="0 0 120 18"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0 9 Q 10 0 20 9 T 40 9 T 60 9 T 80 9 T 100 9 T 120 9"
        stroke={STROKE[color]}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
