type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const records = new Map<string, OtpRecord>();

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function issueOtp(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  records.set(email.trim().toLowerCase(), {
    code,
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  });
  return code;
}

export function verifyOtp(email: string, inputCode: string): boolean {
  const key = email.trim().toLowerCase();
  const rec = records.get(key);
  if (!rec) return false;
  if (Date.now() > rec.expiresAt) {
    records.delete(key);
    return false;
  }
  rec.attempts += 1;
  if (rec.attempts > MAX_ATTEMPTS) {
    records.delete(key);
    return false;
  }
  return rec.code === inputCode.trim();
}

export function clearOtp(email: string) {
  records.delete(email.trim().toLowerCase());
}
