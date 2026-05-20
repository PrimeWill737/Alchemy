"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import styles from "./auth.module.scss";

export function AuthThemeBar() {
  return (
    <div className={styles.themeBar}>
      <ThemeToggle />
    </div>
  );
}
