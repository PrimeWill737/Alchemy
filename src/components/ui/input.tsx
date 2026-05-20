import { useState, type InputHTMLAttributes } from "react";
import styles from "./input.module.scss";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const isPasswordField = props.type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = isPasswordField ? (showPassword ? "text" : "password") : props.type;

  return (
    <label className={styles.field} htmlFor={inputId}>
      <span>{label}</span>
      <div className={`${styles.inputWrap} ${isPasswordField ? styles.passwordField : ""}`}>
        <input id={inputId} {...props} type={resolvedType} />
        {isPasswordField ? (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? <small>{error}</small> : null}
    </label>
  );
}
