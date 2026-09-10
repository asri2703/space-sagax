// Brand logo component. Loads the SVG from /public.

import Image from "next/image";

type Props = {
  size?: number;
  variant?: "default" | "inverse";
};

export function Logo({ size = 36, variant = "default" }: Props) {
  return (
    <Image
      src="/saga-x-logo.svg"
      alt="SAGA-X"
      width={180}
      height={60}
      style={{
        height: size,
        width: "auto",
        filter: variant === "inverse" ? "invert(1) brightness(1.4)" : undefined,
      }}
      priority
    />
  );
}
