/**
 * Codes typed on the reset screen. Supabase OTP length is a project setting,
 * so a code is 6 to 10 digits. The app checks it with
 * `verifyOtp({ email, token, type: 'recovery' })`.
 *
 * GoTrue reports a wrong code and an expired code with one message:
 * "Token has expired or is invalid" (`otp_expired`). That stays separate from
 * a request rate limit and a network failure.
 *
 * `over_email_send_rate_limit` is returned only when the address has an
 * account. The send step treats it as success so the screen does not reveal
 * whether the address is registered.
 */

export const RECOVERY_CODE_MIN = 6;
export const RECOVERY_CODE_MAX = 10;
export const RESEND_COOLDOWN_SEC = 60;

export type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
};

export type RecoveryCodeError = 'wrongCode' | 'expired' | 'codeRejected' | 'rate' | 'network' | 'generic';

export function normalizeRecoveryCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, RECOVERY_CODE_MAX);
}

export function recoveryCodeReady(input: string): boolean {
  const code = normalizeRecoveryCode(input);
  return code.length >= RECOVERY_CODE_MIN && code.length <= RECOVERY_CODE_MAX;
}

/** Seconds left before another reset email can be requested. */
export function resendCooldownRemaining(sentAtMs: number, nowMs: number, cooldownSec = RESEND_COOLDOWN_SEC): number {
  if (!Number.isFinite(sentAtMs) || !Number.isFinite(nowMs) || cooldownSec < 0) return Math.max(0, cooldownSec);
  const elapsed = Math.floor((nowMs - sentAtMs) / 1000);
  if (elapsed <= 0) return cooldownSec;
  return Math.max(0, cooldownSec - elapsed);
}

export function authFailureFrom(error: unknown): AuthFailure {
  if (!error || typeof error !== 'object') {
    return { message: typeof error === 'string' ? error : '' };
  }
  const row = error as { code?: unknown; message?: unknown; status?: unknown; name?: unknown };
  return {
    code: typeof row.code === 'string' ? row.code : undefined,
    message: typeof row.message === 'string' ? row.message : undefined,
    status: typeof row.status === 'number' ? row.status : undefined,
    name: typeof row.name === 'string' ? row.name : undefined,
  };
}

export function isNetworkFailure(error: AuthFailure): boolean {
  if (error.status === 0) return true;
  const blob = `${error.name ?? ''} ${error.message ?? ''}`.toLowerCase();
  return /authretryablefetcherror|failed to fetch|network request failed|network error|internet connection|offline|timeout/.test(blob);
}

/** Per-address email limit. Showing it would confirm the account exists. */
export function isSilentResetSendFailure(error: AuthFailure): boolean {
  const blob = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return /over_email_send_rate_limit|for security purposes/.test(blob);
}

export function isRequestRateLimit(error: AuthFailure): boolean {
  if (isSilentResetSendFailure(error)) return false;
  if (error.status === 429) return true;
  const blob = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return /over_request_rate_limit|too many|rate limit/.test(blob);
}

export function mapRecoveryCodeError(error: AuthFailure): RecoveryCodeError {
  if (isNetworkFailure(error)) return 'network';
  if (isRequestRateLimit(error)) return 'rate';
  const message = (error.message ?? '').toLowerCase();
  const expired = /\bexpired\b/.test(message);
  const invalid = /\binvalid\b/.test(message);
  if (expired && invalid) return 'codeRejected';
  if (expired) return 'expired';
  if (invalid) return 'wrongCode';
  if ((error.code ?? '').toLowerCase() === 'otp_expired') return 'codeRejected';
  return 'generic';
}
