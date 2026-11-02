import Link from "next/link";
import type { MouseEventHandler } from "react";

type BrandMarkProps = {
  className?: string;
};

type BrandLogoProps = {
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 44 44" focusable="false">
        <path className="brand-mark-bag" d="M11 17h22l-2 19H13z" />
        <path className="brand-mark-handle" d="M17 18v-4a5 5 0 0 1 10 0v4" />
        <path className="brand-mark-stitch" d="M16 23h12" />
        <path className="brand-mark-spark" d="m36 4 1.7 4.3L42 10l-4.3 1.7L36 16l-1.7-4.3L30 10l4.3-1.7z" />
      </svg>
    </span>
  );
}

export function BrandLogo({ className = "brand", onClick }: BrandLogoProps) {
  return (
    <Link className={className} href="/" aria-label="Elliot’s Global home" onClick={onClick}>
      <BrandMark />
      <span className="brand-name">elliot&apos;s<span>global</span></span>
    </Link>
  );
}
