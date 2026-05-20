"use client";

import clsx from "clsx";
import { useTheme } from "@/components/theme/theme-provider";
import styles from "./theme-toggle.module.scss";

type Props = {
  className?: string;
  /** Compact label for tight headers */
  compact?: boolean;
};

export function ThemeToggle({ className, compact }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={styles.track}>
        <span className={clsx(styles.thumb, isDark && styles.thumbOn)} />
      </span>
      {!compact ? <span className={styles.label}>{isDark ? "Dark" : "Light"}</span> : null}
    </button>
  );
}
