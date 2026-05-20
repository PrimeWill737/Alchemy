import type { ReactNode } from "react";
import clsx from "clsx";
import styles from "./card.module.scss";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <article className={clsx(styles.card, className)}>{children}</article>;
}
