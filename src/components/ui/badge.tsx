import clsx from "clsx";
import styles from "./badge.module.scss";

type Props = {
  text: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

export function Badge({ text, tone = "default", className }: Props) {
  return <span className={clsx(styles.badge, styles[tone], className)}>{text}</span>;
}
