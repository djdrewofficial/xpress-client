import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { asRecord, mobileJson, type MobileFailure } from '@/lib/mobileJson';

const PENDING_KEY = 'xpress.pendingEventLink';
const CLIPBOARD_KEY = 'xpress.clipboardJoinOffered';

const listeners = new Set<() => void>();

export type RedeemedEventLink = {
  eventId: string;
  role: string;
};

/**
 * Redeem a host or guest link token.
 *
 * Expected XOS contract (align when that PR lands):
 * POST /api/mobile/event-links/redeem
 * body: { token: string }
 * 200: { eventId: string, role: string }
 *
 * `role` is `guest` for a guest link. Other roles (host, partner) see the full plan.
 */
export async function redeemEventLink(token: string): Promise<{ ok: true; data: RedeemedEventLink } | MobileFailure> {
  const clean = token.trim();
  if (!clean) return { ok: false, status: 400, error: '', retryAfter: null };
  const result = await mobileJson('POST', '/api/mobile/event-links/redeem', { token: clean });
  if (!result.ok) return result;
  const record = asRecord(result.data);
  const eventId = typeof record.eventId === 'string' ? record.eventId : '';
  const role = typeof record.role === 'string' ? record.role : '';
  if (!eventId || !role) return { ok: false, status: 500, error: '', retryAfter: null };
  return { ok: true, data: { eventId, role } };
}

const TOKEN = /^[A-Za-z0-9._~-]{8,200}$/;

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
