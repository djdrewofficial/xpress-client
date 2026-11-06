import type { Session } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type SocialResult = { ok: true } | { ok: false; reason: 'cancelled' | 'unavailable' | 'missing' | 'generic' };

async function randomNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isCancel(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code ?? '';
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED' || code === 'SIGN_IN_CANCELLED';
}

async function saveName(given: string, family: string, full: string) {
  if (!full && !given) return;
  await supabase.auth.updateUser({
    data: {
      full_name: full || given,
      given_name: given || undefined,
      family_name: family || undefined,
    },
  });
}

/**
 * Sign in with Apple. The nonce sent to Apple is the SHA-256 of the raw nonce
 * sent to Supabase. Apple returns the person's name and real email only on the
 * first authorization. Hide My Email arrives as the private-relay address inside
 * the identity token, and that address is the account email.
 */
export async function signInWithApple(): Promise<SocialResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'unavailable' };
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return { ok: false, reason: 'unavailable' };
    const rawNonce = await randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return { ok: false, reason: 'generic' };
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return { ok: false, reason: 'generic' };
    const given = credential.fullName?.givenName?.trim() ?? '';
    const family = credential.fullName?.familyName?.trim() ?? '';
    const full = [given, family].filter(Boolean).join(' ');
    if (full) await saveName(given, family, full);
    return { ok: true };
  } catch (error) {
    if (isCancel(error)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'generic' };
  }
}

/**
 * Google ID token via the native SDK. This SDK build does not put a nonce in the
 * token, so Supabase's Google provider needs "Skip nonce check" turned on.
 * Apple stays beside this button whenever it is shown.
 */
export async function signInWithGoogle(): Promise<SocialResult> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!webClientId || !iosClientId) return { ok: false, reason: 'missing' };
  let cancelCode = 'SIGN_IN_CANCELLED';
  try {
    const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin');
    cancelCode = statusCodes.SIGN_IN_CANCELLED;
    GoogleSignin.configure({ webClientId, iosClientId });
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { ok: false, reason: 'cancelled' };
    const idToken = response.data.idToken;
    if (!idToken) return { ok: false, reason: 'generic' };
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return { ok: false, reason: 'generic' };
    const given = response.data.user.givenName?.trim() ?? '';
    const family = response.data.user.familyName?.trim() ?? '';
    const full = response.data.user.name?.trim() || [given, family].filter(Boolean).join(' ');
    if (full || given) await saveName(given, family, full);
    return { ok: true };
  } catch (error) {
    const code = error && typeof error === 'object' ? (error as { code?: string }).code : '';
    if (isCancel(error) || code === cancelCode) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'unavailable' };
  }
}

export function sessionUsesApple(session: Session | null): boolean {
  if (!session) return false;
  if (session.user.app_metadata?.provider === 'apple') return true;
  return (session.user.identities ?? []).some((identity) => identity.provider === 'apple');
}

/** Fresh Apple authorization code for the server to revoke. Null if the person cancels or Apple is unavailable. */
export async function appleAuthorizationCode(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return null;
    const rawNonce = await randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    return credential.authorizationCode ?? null;
  } catch {
    return null;
  }
}
