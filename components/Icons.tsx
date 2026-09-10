// Inline SVG icons in the Lucide style: stroke 2.5px, round caps,
// 24x24 viewBox.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
  });
}

export function CheckIcon(props: IconProps) {
  return base({ ...props, children: <path d="M5 12l4 4L19 6" /> });
}

export function PartyIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M5 22l4-12 7 7-11 5z" />
        <path d="M14 9l3-3 3 3-3 3z" />
        <path d="M2 12l2-2 2 2-2 2z" />
      </>
    ),
  });
}

export function UsersIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <path d="M15 20c0-2 2-3 4-3s2 1 2 3" />
      </>
    ),
  });
}

export function ClockIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  });
}

export function SparkleIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M12 3l1.5 5L19 10l-5.5 2L12 17l-1.5-5L5 10l5.5-2z" />
        <path d="M19 3l.7 2 2 .7-2 .7L19 8l-.7-1.6L16 5.7 18.3 5z" />
      </>
    ),
  });
}

export function MapPinIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M12 22s-7-7-7-12a7 7 0 1114 0c0 5-7 12-7 12z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  });
}

export function ArrowRightIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
  });
}

export function ShieldIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  });
}

export function BankIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M3 10l9-6 9 6" />
        <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
        <path d="M3 21h18" />
      </>
    ),
  });
}

export function ChatIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M21 12a8 8 0 11-3-6.2L21 4l-1 4-3 1z" />
        <path d="M8 11h8M8 15h5" />
      </>
    ),
  });
}

export function MenuIcon(props: IconProps) {
  return base({
    ...props,
    children: <path d="M4 6h16M4 12h16M4 18h16" />,
  });
}

export function ChevronLeftIcon(props: IconProps) {
  return base({ ...props, children: <path d="M15 6l-6 6 6 6" /> });
}

export function ChevronRightIcon(props: IconProps) {
  return base({ ...props, children: <path d="M9 6l6 6-6 6" /> });
}
