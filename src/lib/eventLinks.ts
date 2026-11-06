import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { asRecord, mobileJson, type MobileFailure } from '@/lib/mobileJson';

const PENDING_KEY = 'xpress.pendingEventLink';
const CLIPBOARD_KEY = 'xpress.clipboardJoinOffered';

const listeners = new Set<() => void>();

export type JoinRole = 'host' | 'guest';

export type RedeemedEventLink = {
  eventId: string;
  role: JoinRole;
  alreadyMember: boolean;
};

export type JoinLink = {
  role: JoinRole;
  url: string;
  expiresAt: string;
};

/** Path token from XOS: 22-character base64url, no padding. */
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

/**
 * POST /api/mobile/join-link/redeem
 * body: { token } (path segment only, not the URL)
 * 200: { ok: true, eventId, role: "host" | "guest", alreadyMember }
 * 400 malformed, 401 no session, 403 staff, 404 unknown or expired,
 * 429 with Retry-After seconds, 503 migration not applied.
 */
export async function redeemEventLink(token: string): Promise<{ ok: true; data: RedeemedEventLink } | MobileFailure> {
  const clean = token.trim();
  if (!TOKEN.test(clean)) return { ok: false, status: 400, error: '', retryAfter: null };
  const result = await mobileJson('POST', '/api/mobile/join-link/redeem', { token: clean });
  if (!result.ok) return result;
  const record = asRecord(result.data);
  const eventId = typeof record.eventId === 'string' ? record.eventId : '';
  const role = record.role === 'host' || record.role === 'guest' ? record.role : null;
  if (!eventId || !role) return { ok: false, status: 500, error: '', retryAfter: null };
  return { ok: true, data: { eventId, role, alreadyMember: record.alreadyMember === true } };
}

/** GET /api/mobile/events/:eventId/join-links. Host only. */
export async function listJoinLinks(eventId: string): Promise<{ ok: true; links: JoinLink[] } | MobileFailure> {
  const result = await mobileJson('GET', `/api/mobile/events/${encodeURIComponent(eventId)}/join-links`);
  if (!result.ok) return result;
  const links = asRecord(result.data).links;
  const parsed = Array.isArray(links) ? links.map(parseLink).filter((link): link is JoinLink => !!link) : [];
  return { ok: true, links: parsed };
}

/** POST /api/mobile/events/:eventId/join-links/reset { role }. Host only. */
export async function resetJoinLink(eventId: string, role: JoinRole): Promise<{ ok: true; link: JoinLink } | MobileFailure> {
  const result = await mobileJson('POST', `/api/mobile/events/${encodeURIComponent(eventId)}/join-links/reset`, { role });
  if (!result.ok) return result;
  const link = parseLink(result.data);
  if (!link) return { ok: false, status: 500, error: '', retryAfter: null };
  return { ok: true, link };
}

function parseLink(value: unknown): JoinLink | null {
  const row = asRecord(value);
  if (row.role !== 'host' && row.role !== 'guest') return null;
  if (typeof row.url !== 'string' || !row.url) return null;
  return { role: row.role, url: row.url, expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : '' };
}

/**
 * https://xos.xpressdjs.com/j/<token>
 * xpressclient://j/<token>
 * xpressclient:///j/<token>
 */
export function tokenFromJoinUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const protocol = url.protocol.replace(/:$/, '').toLowerCase();
  const host = url.hostname.toLowerCase();
  const isWeb = (protocol === 'https' || protocol === 'http') && host === 'xos.xpressdjs.com';
  const isScheme = protocol === 'xpressclient';
  if (!isWeb && !isScheme) return null;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const parts = isScheme ? [url.hostname, ...pathParts] : pathParts;
  const marker = parts.findIndex((part) => part === 'j');
  const raw = marker >= 0 ? parts[marker + 1] : undefined;
  if (!raw) return null;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    token = raw;
  }
  return TOKEN.test(token) ? token : null;
}

/** The landing page copies https://xos.xpressdjs.com/j/<token>. Other text is not a join link. */
export function httpsJoinToken(input: string): string | null {
  const text = input.trim();
  if (!/^https:\/\/xos\.xpressdjs\.com\/j\//i.test(text)) return null;
  return tokenFromJoinUrl(text);
}

export function onPendingLink(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function stashPendingLink(token: string) {
  const clean = token.trim();
  if (!clean) return;
  await AsyncStorage.setItem(PENDING_KEY, clean);
  listeners.forEach((listener) => listener());
}

export async function peekPendingLink(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_KEY);
  return value?.trim() ? value.trim() : null;
}

export async function clearPendingLink() {
  await AsyncStorage.removeItem(PENDING_KEY);
  listeners.forEach((listener) => listener());
}

export async function clipboardOfferPending(): Promise<boolean> {
  const value = await AsyncStorage.getItem(CLIPBOARD_KEY);
  return value !== '1';
}

export async function markClipboardOffered() {
  await AsyncStorage.setItem(CLIPBOARD_KEY, '1');
}

export function usePendingEventLink(): boolean {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      peekPendingLink().then((token) => {
        if (live) setPending(!!token);
      });
    };
    refresh();
    const unsubscribe = onPendingLink(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);
  return pending;
}
