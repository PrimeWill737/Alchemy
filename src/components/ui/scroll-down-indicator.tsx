"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import styles from "./scroll-down-indicator.module.scss";

const TOP_THRESHOLD_PX = 96;
const BOTTOM_OFFSET_PX = 140;
const MIN_OVERFLOW_PX = 48;

export function ScrollDownIndicator() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight > window.innerHeight + MIN_OVERFLOW_PX;
    const nearBottom =
      window.scrollY + window.innerHeight >= doc.scrollHeight - BOTTOM_OFFSET_PX;
    const nearTop = window.scrollY <= TOP_THRESHOLD_PX;
    setVisible(scrollable && nearTop && !nearBottom);
  }, []);

  useEffect(() => {
    update();
    const t1 = window.setTimeout(update, 120);
    const t2 = window.setTimeout(update, 600);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const ro = new ResizeObserver(() => update());
    ro.observe(document.documentElement);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [pathname, update]);

  const handleClick = () => {
    window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className={clsx(styles.badge, !visible && styles.badgeHidden)}
      onClick={handleClick}
      aria-label="Scroll down for more content"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className={styles.label}>Scroll</span>
      <span className={styles.chevron} aria-hidden />
    </button>
  );
}
