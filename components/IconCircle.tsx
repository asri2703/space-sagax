// Floating icon circle — sits half-in/half-out of the top border of
// a card. Stroke-width 2.5px per the design system.
//
// Usage:  <IconCircle color="violet"><Calendar /></IconCircle>

import type { ReactNode } from "react";

type Color = "yellow" | "violet" | "pink" | "mint" | "cream";

const COLOR_CLASS: Record<Color, string> = {
  yellow: "",
  violet: "violet",
  pink: "pink",
  mint: "mint",
  cream: "",
};

export function IconCircle({ children, color = "yellow" }: { children: ReactNode; color?: Color }) {
  return (
    <span className={`icon-circle ${COLOR_CLASS[color]} wiggle`} aria-hidden>
      {children}
    </span>
  );
}
