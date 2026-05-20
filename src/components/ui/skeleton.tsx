"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import styles from "./skeleton.module.scss";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

type SkeletonProps = {
  className?: string;
  variant?: "line" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
};

export function Skeleton({ className, variant = "line", width, height, style }: SkeletonProps) {
  const reduced = useReducedMotion();
  const w = typeof width === "number" ? `${width}px` : width;
  const h = typeof height === "number" ? `${height}px` : height;

  const defaultHeight =
    variant === "circle" ? (h ?? w ?? "40px") : variant === "rect" ? (h ?? "120px") : undefined;

  return (
    <span
      className={clsx(
        styles.base,
        variant === "line" && styles.line,
        variant === "circle" && styles.circle,
        variant === "rect" && styles.rect,
        reduced && styles.reduced,
        className,
      )}
      style={{
        width: w ?? (variant === "circle" ? (h ?? "40px") : "100%"),
        height: h ?? defaultHeight,
        ...style,
      }}
      aria-hidden
    />
  );
}

/** Wireframe card with shimmering bars — use while lists load. */
export function WireCard({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={clsx(styles.wireCard, reduced && styles.reduced, className)}>
      <Skeleton className={styles.wireTitle} variant="line" />
      <Skeleton className={styles.wireBlock} variant="line" />
      <Skeleton className={clsx(styles.wireBlock, styles.wireBlockShort)} variant="line" />
    </div>
  );
}

/** Landing pricing section placeholder — three-column wire grid. */
export function PricingWireGrid({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.grid3} aria-busy="true" aria-label="Loading plans">
      {Array.from({ length: count }).map((_, i) => (
        <WireCard key={i} />
      ))}
    </div>
  );
}
