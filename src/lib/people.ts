import { supabase } from '@/lib/supabase';

/* Invite a partner or planner to the couple's event. Posts to the XOS mobile
   endpoint, which creates/refreshes the event_guests row and emails a branded
   set-password invite (the link deep-links back into this app). */

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

export async function inviteGuest(input: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string;
}): Promise<{ ok: boolean; error?: string }> {
  const base = apiBase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!base || !token) return { ok: false, error: 'Not signed in.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${base}/api/mobile/invite-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) return { ok: false, error: json.error ?? 'Could not send the invite.' };
    return { ok: true };
  } catch {
    return { ok: false, error: controller.signal.aborted ? 'Request timed out — please check your connection.' : 'Could not send the invite.' };
  } finally {
    clearTimeout(timer);
  }
}
