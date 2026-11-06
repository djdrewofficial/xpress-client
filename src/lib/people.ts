import { apiBase, authorizedFetch } from '@/lib/api';

/* Invite a partner or planner to the couple's event. Posts to the XOS mobile
   endpoint, which creates/refreshes the event_guests row and emails a branded
   invite (the link deep-links back into this app; sign-in is a one-time code). */

export async function inviteGuest(input: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string;
}): Promise<{ ok: boolean; error?: string }> {
  const base = apiBase();
  if (!base) return { ok: false, error: 'Not signed in.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await authorizedFetch(`${base}/api/mobile/invite-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
