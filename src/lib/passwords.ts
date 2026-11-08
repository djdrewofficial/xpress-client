/** Client-side rules. Supabase also enforces its own minimum (set that to 8). Bcrypt only uses the first 72 bytes. */

export type PasswordIssue = 'short' | 'letter' | 'number' | 'email' | 'long';

const MAX_LENGTH = 72;

export function passwordIssue(password: string, email: string): PasswordIssue | null {
  if (password.length < 8) return 'short';
  if (password.length > MAX_LENGTH) return 'long';
  if (!/[A-Za-z]/.test(password)) return 'letter';
  if (!/[0-9]/.test(password)) return 'number';
  const normalized = email.trim().toLowerCase();
  if (normalized && password.toLowerCase() === normalized) return 'email';
  return null;
}

export function newPasswordIssue(
  password: string,
  confirm: string,
  email: string,
): PasswordIssue | 'mismatch' | null {
  if (password !== confirm) return 'mismatch';
  return passwordIssue(password, email);
}
