import type { AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { emailLooksValid } from '@/lib/phone';
import { passwordIssue, type PasswordIssue } from '@/lib/passwords';
import { supabase } from '@/lib/supabase';

export function confirmRedirectUrl(): string {
  return Linking.createURL('auth/confirm');
}

export function resetRedirectUrl(): string {
  return Linking.createURL('auth/reset');
}

export type EmailAuthError =
  | 'invalidEmail'
  | 'passwordRequired'
  | 'badCredentials'
  | 'unconfirmed'
  | 'exists'
  | 'weak'
  | 'rate'
  | 'generic'
  | PasswordIssue;

export function mapAuthError(error: AuthError): EmailAuthError {
  const blob = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (/rate|over_request|too many/.test(blob)) return 'rate';
  if (/not confirmed|email_not_confirmed/.test(blob)) return 'unconfirmed';
  if (/already registered|already been registered|user_already_exists|already exists/.test(blob)) return 'exists';
  if (/invalid login|invalid_credentials|invalid email or password/.test(blob)) return 'badCredentials';
  if (/password/.test(blob) && /weak|short|at least|should be/.test(blob)) return 'weak';
  return 'generic';
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; error: EmailAuthError }> {
  const clean = email.trim().toLowerCase();
  if (!emailLooksValid(clean)) return { ok: false, error: 'invalidEmail' };
  const issue = passwordIssue(password, clean);
  if (issue) return { ok: false, error: issue };
  const { data, error } = await supabase.auth.signUp({
    email: clean,
    password,
    options: { emailRedirectTo: confirmRedirectUrl() },
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  // Confirmations on: an existing email comes back as a user with no identities.
  const identities = data.user?.identities;
  if (data.user && Array.isArray(identities) && identities.length === 0) {
    return { ok: false, error: 'exists' };
  }
  return { ok: true, needsConfirmation: !data.session };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: EmailAuthError }> {
  const clean = email.trim().toLowerCase();
  if (!emailLooksValid(clean)) return { ok: false, error: 'invalidEmail' };
  if (!password) return { ok: false, error: 'passwordRequired' };
  const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: EmailAuthError }> {
  const clean = email.trim().toLowerCase();
  if (!emailLooksValid(clean)) return { ok: false, error: 'invalidEmail' };
  const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: resetRedirectUrl() });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}

export async function resendConfirmation(email: string): Promise<{ ok: true } | { ok: false; error: EmailAuthError }> {
  const clean = email.trim().toLowerCase();
  if (!emailLooksValid(clean)) return { ok: false, error: 'invalidEmail' };
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: clean,
    options: { emailRedirectTo: confirmRedirectUrl() },
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}

export async function saveNewPassword(
  password: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: EmailAuthError }> {
  const issue = passwordIssue(password, email);
  if (issue) return { ok: false, error: issue };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}
