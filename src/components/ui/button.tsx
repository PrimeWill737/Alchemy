import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import styles from "./button.module.scss";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return <button className={clsx(styles.button, styles[variant], className)} {...props} />;
}
