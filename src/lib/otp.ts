import { emailLooksValid, toE164 } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

/**
 * Passwordless sign-in for existing accounts only (`shouldCreateUser: false`).
 * XOS invites the account; this app never creates one.
 *
 * Phone: `signInWithOtp({ phone })`, then `verifyOtp({ type: 'sms' })`.
 * SMS goes out through a Supabase Send SMS hook to HighLevel (built in XOS).
 * Until that hook and the phone provider are on, phone OTP fails and the screen
 * tells the person to use Email.
 *
 * Email: `signInWithOtp({ email })`, then `verifyOtp({ type: 'email' })`.
 * `emailRedirectTo` is intentionally omitted — setting it is the magic-link path.
 * The email is a 6-digit code only after the Supabase Magic Link template uses
 * `{{ .Token }}` instead of `{{ .ConfirmationURL }}`. This screen always asks
 * for the six digits either way.
 *
 * Staff use this same flow. The app has never had a separate staff password +
 * 2FA screen (everyone signed in with email and password), so email OTP covers
 * existing staff users without a second form.
 */

export type OtpChannel = 'phone' | 'email';

export type SendCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'missing' | 'sms' | 'email' | 'rate' | 'generic' };

export type OtpTransport = {
  send: (channel: OtpChannel, target: string) => Promise<SendCodeResult>;
  verify: (channel: OtpChannel, target: string, token: string) => Promise<boolean>;
};

type AuthErrorLike = { message?: string; code?: string };

function reasonFrom(error: AuthErrorLike, channel: OtpChannel): Exclude<SendCodeResult, { ok: true }>['reason'] {
  const blob = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (/rate|over_request|too many/.test(blob)) return 'rate';
  if (/signups not allowed|user_not_found|user not found|does not exist/.test(blob)) return 'missing';
  if (channel === 'phone') return 'sms';
  return 'email';
}

export async function sendLoginCode(channel: OtpChannel, target: string): Promise<SendCodeResult> {
  if (channel === 'phone') {
    const phone = toE164(target);
    if (!phone) return { ok: false, reason: 'invalid' };
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false, channel: 'sms' },
    });
    if (error) return { ok: false, reason: reasonFrom(error, 'phone') };
    return { ok: true };
  }

  const email = target.trim().toLowerCase();
  if (!emailLooksValid(email)) return { ok: false, reason: 'invalid' };
  // No emailRedirectTo: that parameter is what turns the message into a magic link.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, reason: reasonFrom(error, 'email') };
  return { ok: true };
}

export async function verifyLoginCode(channel: OtpChannel, target: string, token: string): Promise<boolean> {
  const clean = token.replace(/\D/g, '');
  if (clean.length < 6) return false;
  if (channel === 'phone') {
    const phone = toE164(target);
    if (!phone) return false;
    const { error } = await supabase.auth.verifyOtp({ phone, token: clean, type: 'sms' });
    return !error;
  }
  const email = target.trim().toLowerCase();
  const { error } = await supabase.auth.verifyOtp({ email, token: clean, type: 'email' });
  return !error;
}

export const liveOtp: OtpTransport = {
  send: sendLoginCode,
  verify: verifyLoginCode,
};
