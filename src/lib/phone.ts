/** US phone helpers and a small email check. No network. */

const DIGITS = /\D/g;

export function digitsOnly(input: string): string {
  return input.replace(DIGITS, '');
}

/**
 * Normalize to E.164.
 * - 10 digits → +1 (US)
 * - 11 digits starting with 1 → +1
 * - a leading + keeps the country code when the digit length is 10–15
 */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = digitsOnly(trimmed);
  if (trimmed.startsWith('+')) {
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
    return null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Format a US number as the user types: (555) 555-0123. Leading + is left intact. */
export function formatUSPhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) return `+${digitsOnly(trimmed)}`;
  const digits = digitsOnly(input);
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  const n = national.slice(0, 10);
  if (n.length === 0) return '';
  if (n.length < 4) return `(${n}`;
  if (n.length < 7) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

/** (•••) •••-0123 — last four digits stay visible. Longer international numbers use +•••0123. */
export function maskPhone(input: string): string {
  const digits = digitsOnly(input);
  const last4 = (digits.slice(-4) || '••••').padEnd(4, '•').slice(0, 4);
  if (digits.length > 11) return `+•••${last4}`;
  return `(•••) •••-${last4}`;
}

/** a•••@domain.com */
export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '•••';
  return `${trimmed.slice(0, 1)}•••${trimmed.slice(at)}`;
}

export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
