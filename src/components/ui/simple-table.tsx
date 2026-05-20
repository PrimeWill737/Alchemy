import type { ReactNode } from "react";
import styles from "./simple-table.module.scss";

type Props = {
  headers: string[];
  rows: ReactNode[][];
};

export function SimpleTable({ headers, rows }: Props) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`row-${idx}`}>
              {row.map((cell, cellIdx) => (
                <td key={`cell-${idx}-${cellIdx}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
