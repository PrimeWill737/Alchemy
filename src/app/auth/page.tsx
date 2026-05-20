import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";
import { AuthThemeBar } from "@/app/auth/auth-theme-bar";
import styles from "./auth.module.scss";

export default function AuthPage() {
  return (
    <main className={styles.page}>
      <AuthThemeBar />
      <div className={styles.wrapper}>
        <Card>
          <Link href="/" className={styles.backLink}>
            ← Back to home
          </Link>
          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subheading}>
            Sign in to Alchemy with your work email.
          </p>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
