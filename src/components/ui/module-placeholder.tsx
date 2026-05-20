import styles from "./module-placeholder.module.scss";

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
