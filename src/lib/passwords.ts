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

export type PasswordFormIssue = {
  field: 'password' | 'confirm';
  issue: PasswordIssue | 'mismatch';
};

/** Length and policy belong to the first field. A difference belongs to confirm. */
export function passwordFieldsIssue(password: string, confirm: string, email: string): PasswordFormIssue | null {
  const issue = newPasswordIssue(password, confirm, email);
  if (!issue) return null;
  return { field: issue === 'mismatch' ? 'confirm' : 'password', issue };
}

/**
 * Keyboard submit can carry the native field text before React state includes
 * the last character. That text is the value to check.
 */
export function valuesForPasswordSubmit(input: {
  password: string;
  confirm: string;
  confirmFromKeyboard?: string | null;
}): { password: string; confirm: string } {
  return {
    password: input.password,
    confirm: input.confirmFromKeyboard != null ? input.confirmFromKeyboard : input.confirm,
  };
}

/**
 * After an error is showing, follow the current text.
 * A length warning must not stay once the values are long enough to be a mismatch,
 * and a valid match clears the error.
 */
export function passwordErrorAfterEdit(
  previous: PasswordFormIssue | null,
  password: string,
  confirm: string,
  email: string,
): PasswordFormIssue | null {
  if (!previous) return null;
  return passwordFieldsIssue(password, confirm, email);
}

/** Server password rejections. A weak password is not the 8-character rule. */
export function passwordServerIssue(blob: string): 'short' | 'weak' | null {
  const text = blob.toLowerCase();
  if (!text.includes('password')) return null;
  if (/at least \d+|too short|\bshort\b/.test(text)) return 'short';
  if (/weak|easy to guess|pwned|leaked|should be/.test(text)) return 'weak';
  return null;
}
