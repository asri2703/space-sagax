"use client";

import type {
  CSSProperties,
  ComponentPropsWithoutRef,
  ElementType,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useState } from "react";

type SpotlightSurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "style">;

export function SpotlightSurface<T extends ElementType = "div">({
  as,
  className = "",
  children,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: SpotlightSurfaceProps<T>) {
  const Tag = (as || "div") as ElementType;
  const [spot, setSpot] = useState({ x: 50, y: 50, active: false });

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setSpot({
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
      active: true,
    });

    if (typeof onPointerMove === "function") {
      onPointerMove(event as never);
    }
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLElement>) {
    setSpot((current) => ({ ...current, active: false }));

    if (typeof onPointerLeave === "function") {
      onPointerLeave(event as never);
    }
  }

  const nextStyle = {
    ...style,
    "--spot-x": `${spot.x}%`,
    "--spot-y": `${spot.y}%`,
    "--spot-opacity": spot.active ? 1 : 0,
  } as CSSProperties;

  return (
    <Tag
      {...props}
      className={["spotlight-surface", className].filter(Boolean).join(" ")}
      style={nextStyle}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      {children}
    </Tag>
  );
}
