import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@supabase/auth-js/dist/module/lib/webauthn';

import { supabase } from '@/lib/supabase';

export type PasskeySignInResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'none' | 'unavailable' | 'disabled' | 'unconfirmed' | 'failed' };

export type PasskeyEnrollResult =
  | { ok: true; name: string }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'disabled' | 'exists' | 'sso' | 'limit' | 'failed' };

type NativePasskeys = typeof import('react-native-passkeys');

async function loadPasskeys(): Promise<NativePasskeys | null> {
  try {
    return await import('react-native-passkeys');
  } catch {
    return null;
  }
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const row = error as { code?: string; name?: string; message?: string };
  return `${row.code ?? ''} ${row.name ?? ''} ${row.message ?? ''}`.toLowerCase();
}

function isCancel(error: unknown): boolean {
  const code = errorCode(error);
  return /cancel|usercancelled/.test(code);
}

function isNone(error: unknown): boolean {
  const code = errorCode(error);
  return /credential_not_found|no credential|no matching|notallowed|not allowed/.test(code);
}

/** Discoverable passkey sign-in. Supabase issues the challenge and verifies the assertion before a session exists. */
export async function signInWithPasskey(): Promise<PasskeySignInResult> {
  const passkeys = await loadPasskeys();
  if (!passkeys || !passkeys.isSupported()) return { ok: false, reason: 'unavailable' };
  try {
    const started = await supabase.auth.passkey.startAuthentication();
    if (started.error || !started.data) {
      const code = errorCode(started.error);
      if (code.includes('passkey_disabled')) return { ok: false, reason: 'disabled' };
      return { ok: false, reason: 'failed' };
    }
    const options = started.data.options;
    const credential = await passkeys.get({
      challenge: options.challenge,
      timeout: options.timeout,
      rpId: options.rpId,
      allowCredentials: options.allowCredentials,
      userVerification: options.userVerification,
    });
    if (!credential) return { ok: false, reason: 'none' };
    const verified = await supabase.auth.passkey.verifyAuthentication({
      challengeId: started.data.challenge_id,
      credential: credential as AuthenticationResponseJSON,
    });
    if (verified.error || !verified.data?.session) {
      const code = errorCode(verified.error);
      if (code.includes('email_not_confirmed') || code.includes('phone_not_confirmed')) return { ok: false, reason: 'unconfirmed' };
      if (code.includes('credential_not_found')) return { ok: false, reason: 'none' };
      if (code.includes('passkey_disabled')) return { ok: false, reason: 'disabled' };
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (error) {
    if (isCancel(error)) return { ok: false, reason: 'cancelled' };
    if (isNone(error)) return { ok: false, reason: 'none' };
    if (errorCode(error).includes('notsupported')) return { ok: false, reason: 'unavailable' };
    return { ok: false, reason: 'failed' };
  }
}

/** Register a passkey for the signed-in user. The server stores the public key only after it verifies the attestation. */
export async function enrollPasskey(): Promise<PasskeyEnrollResult> {
  const passkeys = await loadPasskeys();
  if (!passkeys || !passkeys.isSupported()) return { ok: false, reason: 'unavailable' };
  try {
    const started = await supabase.auth.passkey.startRegistration();
    if (started.error || !started.data) {
      return { ok: false, reason: enrollReason(started.error) };
    }
    const options = started.data.options;
    const created = await passkeys.create({
      rp: options.rp,
      user: options.user,
      challenge: options.challenge,
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      excludeCredentials: options.excludeCredentials,
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation,
    });
    if (!created) return { ok: false, reason: 'cancelled' };
    const verified = await supabase.auth.passkey.verifyRegistration({
      challengeId: started.data.challenge_id,
      credential: toRegistrationJson(created),
    });
    if (verified.error || !verified.data) return { ok: false, reason: enrollReason(verified.error) };
    return { ok: true, name: verified.data.friendly_name || '' };
  } catch (error) {
    if (isCancel(error)) return { ok: false, reason: 'cancelled' };
    if (errorCode(error).includes('notsupported')) return { ok: false, reason: 'unavailable' };
    return { ok: false, reason: 'failed' };
  }
}

function enrollReason(error: unknown): Exclude<PasskeyEnrollResult, { ok: true }>['reason'] {
  const code = errorCode(error);
  if (code.includes('passkey_disabled')) return 'disabled';
  if (code.includes('credential_exists')) return 'exists';
  if (code.includes('too_many_passkeys')) return 'limit';
  if (code.includes('sso') || code.includes('provider')) return 'sso';
  return 'failed';
}

function toRegistrationJson(created: Awaited<ReturnType<NativePasskeys['create']>>): RegistrationResponseJSON {
  if (!created) throw new Error('missing credential');
  const { getPublicKey, ...response } = created.response;
  const publicKey = typeof getPublicKey === 'function' ? getPublicKey() : null;
  return {
    id: created.id,
    rawId: created.rawId,
    type: created.type,
    authenticatorAttachment: created.authenticatorAttachment,
    clientExtensionResults: created.clientExtensionResults,
    response: {
      ...response,
      ...(publicKey ? { publicKey } : {}),
    },
  };
}
