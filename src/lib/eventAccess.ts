import { apiBase, authorizedFetch } from '@/lib/api';

/* Couple-app membership. Every call goes through authorizedFetch so the
   access token is read fresh and a 401 refreshes the session once.
   Shapes match XOS /api/mobile event access (PR 42). */

const TIMEOUT_MS = 30000;

export type ClaimReason = 'linked' | 'none' | 'staff' | 'guest' | 'unavailable';

export type ClaimResult = {
  reason: ClaimReason;
  eventIds: string[];
};

export type EventMember = {
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isContractHolder: boolean;
  isPrimary: boolean;
  canRemove: boolean;
};

export type EventInvite = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: 'pending' | 'expired';
  expiresAt: string;
};

export type Delivery = { channel: 'sms' | 'email'; ok: boolean };

export type DeliveryLine = 'textSent' | 'textFailed' | 'textFailedTryEmail' | 'emailSent' | 'emailFailed';

export type SentInvite = {
  status: string;
  delivery: Delivery[];
};

export type JoinCode = {
  code: string;
  expiresAt: string;
  eventId: string;
};

export type RedeemedCode = {
  eventId: string;
  role: string;
  alreadyMember: boolean;
};

export type AccessErr = {
  ok: false;
  status: number;
  error: string;
  retryAfter: number | null;
};

export type AccessResult<T> = { ok: true; data: T } | AccessErr;

export type InviteErrorKind =
  | 'already'
  | 'own'
  | 'phone'
  | 'contact'
  | 'setup'
  | 'revoked'
  | 'joined'
  | 'protected'
  | 'missing'
  | 'generic';

export type JoinErrorKind = 'badCode' | 'rate' | 'staff' | 'guest' | 'format' | 'forbidden' | 'setup' | 'generic';

type InviteLang = 'en' | 'es';

export function formatJoinCodeInput(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

/** Readable US number. Other numbers stay as the server sent them. */
export function displayPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.length === 10 ? digits : null;
  if (!national) return raw;
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

export function contactLine(phone: string | null, email: string | null): string | null {
  return displayPhone(phone) || email || null;
}

/** App Store or web link, only when EXPO_PUBLIC_APP_STORE_URL is set. */
export function configuredAppLink(): string | null {
  const raw = process.env.EXPO_PUBLIC_APP_STORE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function deliveryLines(delivery: Delivery[]): DeliveryLine[] {
  const emailOk = delivery.some((row) => row.channel === 'email' && row.ok);
  const lines: DeliveryLine[] = [];
  for (const row of delivery) {
    if (row.channel === 'sms') lines.push(row.ok ? 'textSent' : emailOk ? 'textFailed' : 'textFailedTryEmail');
    else if (row.channel === 'email') lines.push(row.ok ? 'emailSent' : 'emailFailed');
  }
  return lines;
}

export function inviteErrorKind(status: number, error: string): InviteErrorKind {
  if (status === 503) return 'setup';
  if (status === 403) return 'protected';
  if (status === 404) return 'missing';
  if (status === 409) {
    if (/revoked/i.test(error)) return 'revoked';
    if (/joined/i.test(error)) return 'joined';
    return 'already';
  }
  if (status === 400) {
    if (/your phone|your email/i.test(error)) return 'own';
    if (/phone/i.test(error)) return 'phone';
    return 'contact';
  }
  return 'generic';
}

export function joinErrorKind(status: number, error: string, accountType: string | null): JoinErrorKind {
  if (status === 404) return 'badCode';
  if (status === 429) return 'rate';
  if (status === 503) return 'setup';
  if (status === 403) {
    if (accountType === 'staff' || /staff/i.test(error)) return 'staff';
    if (accountType === 'event_guest' || /guest/i.test(error)) return 'guest';
    return 'forbidden';
  }
  if (status === 400) return 'format';
  return 'generic';
}

/** Link any open invite for this login. Call once the one-time code session exists, before routing. */
export async function claimEventInvites(signal?: AbortSignal): Promise<ClaimResult> {
  const result = await postJson('/api/mobile/invites/claim', {}, signal);
  if (!result.ok) return { reason: 'unavailable', eventIds: [] };
  const record = asRecord(result.data);
  const reason = record.reason;
  const eventIds = Array.isArray(record.eventIds)
    ? record.eventIds.filter((id): id is string => typeof id === 'string')
    : [];
  if (reason === 'linked' || reason === 'none' || reason === 'staff' || reason === 'guest') {
    return { reason, eventIds };
  }
  return { reason: 'unavailable', eventIds };
}

export function listEventAccess(eventId: string, signal?: AbortSignal): Promise<AccessResult<{ members: EventMember[]; invites: EventInvite[] }>> {
  return getJson(`/api/mobile/events/${eventId}/members`, signal, (body) => {
    const record = asRecord(body);
    const members = Array.isArray(record.members) ? record.members.map(parseMember).filter((row): row is EventMember => !!row) : [];
    const invites = Array.isArray(record.invites) ? record.invites.map(parseInvite).filter((row): row is EventInvite => !!row) : [];
    return { members, invites };
  });
}

export function createEventInvite(
  eventId: string,
  input: { phone?: string; email?: string; name?: string; lang: InviteLang },
  signal?: AbortSignal,
): Promise<AccessResult<SentInvite>> {
  const body: Record<string, string> = { lang: input.lang };
  if (input.phone) body.phone = input.phone;
  if (input.email) body.email = input.email;
  if (input.name) body.name = input.name;
  return postJson(`/api/mobile/events/${eventId}/invites`, body, signal).then((result) =>
    result.ok ? { ok: true, data: parseSent(result.data) } : result,
  );
}

export function resendEventInvite(eventId: string, inviteId: string, signal?: AbortSignal): Promise<AccessResult<SentInvite>> {
  return postJson(`/api/mobile/events/${eventId}/invites/${inviteId}/resend`, {}, signal).then((result) =>
    result.ok ? { ok: true, data: parseSent(result.data) } : result,
  );
}

export function revokeEventInvite(eventId: string, inviteId: string, signal?: AbortSignal): Promise<AccessResult<{ ok: true }>> {
  return postJson(`/api/mobile/events/${eventId}/invites/${inviteId}/revoke`, {}, signal).then((result) =>
    result.ok ? { ok: true, data: { ok: true as const } } : result,
  );
}

export function removeEventMember(eventId: string, clientId: string, signal?: AbortSignal): Promise<AccessResult<{ ok: true }>> {
  return sendJson('DELETE', `/api/mobile/events/${eventId}/members/${clientId}`, undefined, signal).then((result) =>
    result.ok ? { ok: true, data: { ok: true as const } } : result,
  );
}

export function getJoinCode(eventId: string, signal?: AbortSignal): Promise<AccessResult<JoinCode>> {
  return getJson(`/api/mobile/events/${eventId}/join-code`, signal, parseJoinCode);
}

export function resetJoinCode(eventId: string, signal?: AbortSignal): Promise<AccessResult<JoinCode>> {
  return postJson(`/api/mobile/events/${eventId}/join-code/reset`, {}, signal).then((result) =>
    result.ok ? { ok: true, data: parseJoinCode(result.data) } : result,
  );
}

export function redeemJoinCode(code: string, signal?: AbortSignal): Promise<AccessResult<RedeemedCode>> {
  return postJson('/api/mobile/join-code/redeem', { code }, signal).then((result) => {
    if (!result.ok) return result;
    const record = asRecord(result.data);
    const eventId = typeof record.eventId === 'string' ? record.eventId : '';
    if (!eventId) return { ok: false, status: 500, error: '', retryAfter: null };
    return {
      ok: true,
      data: {
        eventId,
        role: typeof record.role === 'string' ? record.role : 'partner',
        alreadyMember: record.alreadyMember === true,
      },
    };
  });
}

function parseSent(body: unknown): SentInvite {
  const record = asRecord(body);
  const invite = asRecord(record.invite);
  const delivery = Array.isArray(record.delivery) ? record.delivery.map(parseDelivery).filter((row): row is Delivery => !!row) : [];
  return { status: typeof invite.status === 'string' ? invite.status : 'pending', delivery };
}

function parseDelivery(value: unknown): Delivery | null {
  const row = asRecord(value);
  if (row.channel !== 'sms' && row.channel !== 'email') return null;
  return { channel: row.channel, ok: row.ok === true };
}

function parseMember(value: unknown): EventMember | null {
  const row = asRecord(value);
  if (typeof row.clientId !== 'string') return null;
  return {
    clientId: row.clientId,
    name: typeof row.name === 'string' && row.name.trim() ? row.name : '',
    email: typeof row.email === 'string' ? row.email : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    role: typeof row.role === 'string' ? row.role : '',
    isContractHolder: row.isContractHolder === true,
    isPrimary: row.isPrimary === true,
    canRemove: row.canRemove === true,
  };
}

function parseInvite(value: unknown): EventInvite | null {
  const row = asRecord(value);
  if (typeof row.id !== 'string') return null;
  if (row.status !== 'pending' && row.status !== 'expired') return null;
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : null,
    email: typeof row.email === 'string' ? row.email : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    role: typeof row.role === 'string' ? row.role : '',
    status: row.status,
    expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : '',
  };
}

function parseJoinCode(body: unknown): JoinCode {
  const row = asRecord(body);
  return {
    code: typeof row.code === 'string' ? row.code : '',
    expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : '',
    eventId: typeof row.eventId === 'string' ? row.eventId : '',
  };
}

async function getJson<T>(path: string, signal: AbortSignal | undefined, parse: (body: unknown) => T): Promise<AccessResult<T>> {
  const result = await sendJson('GET', path, undefined, signal);
  if (!result.ok) return { ok: false, status: result.status, error: result.error, retryAfter: result.retryAfter };
  return { ok: true, data: parse(result.data) };
}

function postJson(path: string, body: Record<string, string>, signal?: AbortSignal): Promise<AccessResult<unknown>> {
  return sendJson('POST', path, body, signal);
}

async function sendJson(method: 'GET' | 'POST' | 'DELETE', path: string, body: Record<string, string> | undefined, signal?: AbortSignal): Promise<AccessResult<unknown>> {
  const base = apiBase();
  if (!base) return { ok: false, status: 0, error: '', retryAfter: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await authorizedFetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const record = asRecord(json);
      return {
        ok: false,
        status: res.status,
        error: typeof record.error === 'string' ? record.error : '',
        retryAfter: retryAfterSeconds(res),
      };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, error: '', retryAfter: null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function retryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get('Retry-After');
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
