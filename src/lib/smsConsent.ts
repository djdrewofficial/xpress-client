import { supabase } from '@/lib/supabase';
import { toE164 } from '@/lib/phone';

/**
 * Promotional texts are not stored on a server from this app.
 * `xpress.marketingTexts` is a device flag only. It has no phone number,
 * no timestamp, and no audit source, so it is not consent.
 */

const PHONE_COLUMNS = ['phone', 'mobile_phone', 'mobile'] as const;

export async function loadOwnMobile(opts: { clientId: string | null; eventGuestId: string | null }): Promise<string | null> {
  const table = opts.clientId ? 'clients' : opts.eventGuestId ? 'event_guests' : null;
  const id = opts.clientId ?? opts.eventGuestId;
  if (!table || !id) return null;
  for (const column of PHONE_COLUMNS) {
    const { data, error } = await supabase.from(table).select(column).eq('id', id).maybeSingle();
    if (error || !data) continue;
    const value = (data as Record<string, unknown>)[column];
    if (typeof value === 'string') {
      const phone = toE164(value);
      if (phone) return phone;
    }
  }
  return null;
}

export type SmsSaveResult =
  | { ok: false; reason: 'no-phone' }
  | { ok: false; reason: 'no-server' };

/** Turning texts on never writes a local-only flag. There is no consent API yet. */
export async function requestPromotionalTexts(opts: {
  clientId: string | null;
  eventGuestId: string | null;
}): Promise<SmsSaveResult> {
  const phone = await loadOwnMobile(opts);
  if (!phone) return { ok: false, reason: 'no-phone' };
  return { ok: false, reason: 'no-server' };
}
