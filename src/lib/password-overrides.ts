/** In-memory new passwords after OTP reset (demo + static accounts). */

const overrides = new Map<string, string>();

export function setPasswordOverride(email: string, password: string) {
  overrides.set(email.trim().toLowerCase(), password);
}

export function getPasswordOverride(email: string): string | undefined {
  return overrides.get(email.trim().toLowerCase());
}
