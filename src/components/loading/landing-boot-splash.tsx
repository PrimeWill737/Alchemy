"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./landing-boot-splash.module.scss";

async function runBootSequence(reducedMotion: boolean): Promise<void> {
  const minMs = reducedMotion ? 280 : 1050;

  const minDelay = new Promise<void>((resolve) => {
    window.setTimeout(resolve, minMs);
  });

  const fontsReady =
    typeof document !== "undefined" && document.fonts?.ready
      ? document.fonts.ready.catch(() => undefined)
      : Promise.resolve();

  const windowLoaded = new Promise<void>((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    if (document.readyState === "complete") {
      resolve();
      return;
    }
    window.addEventListener("load", () => resolve(), { once: true });
  });

  await Promise.all([fontsReady, windowLoaded, minDelay]);

  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  if (!reducedMotion) {
    await new Promise<void>((r) => window.setTimeout(r, 120));
  }
}

export function LandingBootSplash() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await runBootSequence(reducedMotion);
      if (!cancelled) setShowSplash(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div
          key="landing-boot-splash"
          className={styles.splash}
          role="presentation"
          aria-hidden
          aria-busy="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.85,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className={styles.mesh} aria-hidden />
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />

          <div className={styles.card}>
            <p className={styles.logo}>Alchemy</p>
            <h1 className={styles.title}>Welcome in</h1>
            <p className={styles.sub}>
              Warming up your workspace preview — paints, fonts, and polish loading first.
            </p>
            <div className={styles.dots} aria-hidden>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <div className={styles.sparkleRow} aria-hidden>
              <span className={styles.sparkle}>✦</span>
              <span className={styles.sparkle}>🌿</span>
              <span className={styles.sparkle}>✦</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
