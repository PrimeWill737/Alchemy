"use client";

import { DISPLAY_CURRENCY_OPTIONS } from "@/lib/display-currencies";
import clsx from "clsx";
import styles from "./admin-currency-select.module.scss";

type Props = {
  value: string;
  onChange: (code: string) => void | Promise<void>;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

export function AdminCurrencySelect({ value, onChange, className, ariaLabel, disabled }: Props) {
  return (
    <select
      className={clsx(styles.select, className)}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel ?? "Display currency"}
      onChange={(e) => void onChange(e.target.value)}
    >
      {DISPLAY_CURRENCY_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
