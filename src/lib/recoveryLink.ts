/**
 * The saved recovery template is
 * `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`.
 * GoTrue keeps RedirectTo only when it matches the Site URL origin or the
 * redirect allow list. The allow list has `xpressclient://auth/reset`.
 * `Linking.createURL('auth/reset')` emits `xpressclient:///auth/reset`, which
 * does not match, so GoTrue substitutes Site URL `https://xos.xpressdjs.com`
 * and the email opens the website.
 *
 * Request the allow-listed double-slash URL with no query. The template adds
 * the token hash. Incoming https reset links, the triple-slash form, and
 * PKCE codes are still accepted. Join links are not auth callbacks.
 */

export const RECOVERY_REDIRECT_URL = 'xpressclient://auth/reset';

/** Build the saved template's href for a fixture hash. No network call. */
export function recoveryTemplateHref(tokenHash: string): string {
  return `${RECOVERY_REDIRECT_URL}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

const AUTH_HOST = 'xos.xpressdjs.com';
const APP_SCHEME = 'xpressclient';

const HASH_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
type HashType = (typeof HASH_TYPES)[number];

export type AuthPath = 'reset' | 'confirm' | 'set-password';

export type AuthCredentials = {
  kind: 'credentials';
  path: AuthPath | null;
  mode: 'code' | 'otp' | 'implicit';
  code: string | null;
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
};

export type AuthLink = { kind: 'none' } | { kind: 'failed' } | AuthCredentials;

export type AuthAdoptResult = 'recovery' | 'session' | 'expired' | 'ignored';

export type AuthExchange = {
  exchangeCodeForSession(code: string): Promise<{
    data: { session: object | null; redirectType?: string | null };
    error: { message?: string; code?: string } | null;
  }>;
  verifyOtp(args: { token_hash: string; type: HashType }): Promise<{
    data: { session: object | null };
    error: { message?: string; code?: string } | null;
  }>;
  getSession(): Promise<{ data: { session: object | null } }>;
};

export function recoveryRedirectUrl(): string {
  return RECOVERY_REDIRECT_URL;
}

function isHashType(value: string): value is HashType {
  return (HASH_TYPES as readonly string[]).includes(value);
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function authQuery(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hash = url.includes('#') ? url.split('#')[1] ?? '' : '';
  const withoutHash = url.split('#')[0] ?? '';
  const query = withoutHash.includes('?') ? withoutHash.split('?')[1] ?? '' : '';
  for (const raw of [query, hash]) {
    if (!raw) continue;
    for (const pair of raw.split('&')) {
      const [key, value] = pair.split('=');
      if (!key) continue;
      out[decodeParam(key)] = decodeParam(value ?? '');
    }
  }
  return out;
}

function authPath(parts: string[]): AuthPath | null {
  const marker = parts.findIndex((part) => part === 'auth');
  const next = marker >= 0 ? parts[marker + 1] : undefined;
  if (next === 'reset' || next === 'confirm' || next === 'set-password') return next;
  return null;
}

function partsFor(url: URL): string[] | null {
  const protocol = url.protocol.replace(/:$/, '').toLowerCase();
  const host = url.hostname.toLowerCase();
  if (protocol === 'https') {
    if (host !== AUTH_HOST) return null;
    return url.pathname.split('/').filter(Boolean);
  }
  if (protocol !== APP_SCHEME) return null;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const hostPart = host && host !== 'localhost' ? [host] : [];
  return [...hostPart, ...pathParts];
}

function expectsRecovery(path: AuthPath | null, type: string | null): boolean {
  return path === 'reset' || type === 'recovery';
}

function asRecovery(path: AuthPath | null, type: string | null, redirectType: string | null | undefined): boolean {
  if (type === 'recovery' || redirectType === 'recovery') return true;
  return path === 'reset' && (redirectType == null || redirectType === '');
}

/** Classify an incoming URL. Fixture values only; this does not contact Supabase. */
export function classifyAuthUrl(input: string): AuthLink {
  const text = input.trim();
  if (!text) return { kind: 'none' };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { kind: 'none' };
  }
  const parts = partsFor(url);
  if (!parts) return { kind: 'none' };
  const path = authPath(parts);
  // The website owns https://xos.xpressdjs.com/auth/set-password and the site
  // root. Adopting those would consume a staff or browser recovery token.
  const https = url.protocol === 'https:';
  if (https && path !== 'reset' && path !== 'confirm') return { kind: 'none' };
  const params = authQuery(text);
  const type = params.type || null;
  const errorBlob = `${params.error ?? ''} ${params.error_code ?? ''} ${params.error_description ?? ''}`.toLowerCase();
  const recoveryError =
    path === 'reset' ||
    path === 'set-password' ||
    type === 'recovery' ||
    /otp_expired|flow_state_expired|flow_state_not_found/.test(errorBlob);
  if ((params.error || params.error_code || params.error_description) && recoveryError) {
    return { kind: 'failed' };
  }
  if (params.code) {
    return {
      kind: 'credentials',
      path,
      mode: 'code',
      code: params.code,
      tokenHash: null,
      accessToken: null,
      refreshToken: null,
      type,
    };
  }
  const otpType = isHashType(type ?? '') ? type : path === 'reset' ? 'recovery' : null;
  if (params.token_hash && otpType && isHashType(otpType)) {
    return {
      kind: 'credentials',
      path,
      mode: 'otp',
      code: null,
      tokenHash: params.token_hash,
      accessToken: null,
      refreshToken: null,
      type: otpType,
    };
  }
  if (params.access_token && params.refresh_token) {
    return {
      kind: 'credentials',
      path,
      mode: 'implicit',
      code: null,
      tokenHash: null,
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
      type,
    };
  }
  if (path === 'reset') return { kind: 'failed' };
  return { kind: 'none' };
}

/**
 * Turn a classified link into a session outcome.
 * A recovery result is the only one that may open the new-password screen.
 * Expired and used links do not replace a session that is already on the device.
 */
export async function applyAuthLink(link: AuthLink, client: AuthExchange): Promise<AuthAdoptResult> {
  if (link.kind === 'none') return 'ignored';
  if (link.kind === 'failed') return 'expired';
  // Password recovery uses a token hash. Sign-in uses a PKCE code or an ID token.
  // An access_token fragment is not one of those, signed in or out, on any path.
  if (link.mode === 'implicit') return 'ignored';
  const recovery = expectsRecovery(link.path, link.type);
  try {
    if (link.mode === 'code' && link.code) {
      const { data, error } = await client.exchangeCodeForSession(link.code);
      if (error || !data.session) return recovery ? 'expired' : 'ignored';
      return asRecovery(link.path, link.type, data.redirectType) ? 'recovery' : 'session';
    }
    if (link.mode === 'otp' && link.tokenHash && link.type && isHashType(link.type)) {
      const { data, error } = await client.verifyOtp({ token_hash: link.tokenHash, type: link.type });
      if (error || !data.session) return recovery ? 'expired' : 'ignored';
      return link.type === 'recovery' || link.path === 'reset' ? 'recovery' : 'session';
    }
  } catch {
    return recovery ? 'expired' : 'ignored';
  }
  return 'ignored';
}

/**
 * The stored value has to be the recovery session's user id.
 * A bare flag must not let whatever session is on the device change its password.
 */
export function passwordChangeAllowed(storedUserId: string | null, sessionUserId: string | null): boolean {
  if (!storedUserId || !sessionUserId) return false;
  if (storedUserId === '1') return false;
  return storedUserId === sessionUserId;
}

export function sessionUserId(session: object | null): string | null {
  if (!session || typeof session !== 'object' || !('user' in session)) return null;
  const user = session.user;
  if (!user || typeof user !== 'object' || !('id' in user)) return null;
  const id = user.id;
  return typeof id === 'string' && id && id !== '1' ? id : null;
}

export function isRecoverySessionFailure(code: string | undefined, message: string | undefined): boolean {
  const blob = `${code ?? ''} ${message ?? ''}`.toLowerCase();
  return /auth session missing|session_not_found|otp_expired|flow_state_expired|flow_state_not_found/.test(blob);
}

let authAdopts = 0;
const adoptWatchers = new Set<() => void>();

export function authAdoptInflight(): boolean {
  return authAdopts > 0;
}

export function startAuthAdopt(): void {
  authAdopts += 1;
  adoptWatchers.forEach((notify) => notify());
}

export function finishAuthAdopt(): void {
  authAdopts = Math.max(0, authAdopts - 1);
  adoptWatchers.forEach((notify) => notify());
}

export function subscribeAuthAdopt(notify: () => void): () => void {
  adoptWatchers.add(notify);
  return () => {
    adoptWatchers.delete(notify);
  };
}
