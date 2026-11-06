import { apiBase, authorizedFetch } from '@/lib/api';

import type { SectionNotesSave } from '@/lib/sectionNotes';

/* Free text for what to keep off the dance floor that isn't a specific song.
   GET/PUT /api/mobile/planning/do-not-play-notes?eventId=<uuid>
   { text: string|null }
   Guests are rejected with 403. A 404 means the route is not deployed yet. */

export type DoNotPlayNotesGet =
  | { ok: true; text: string | null }
  | { ok: false; unavailable: boolean; forbidden: boolean };

function notesUrl(eventId: string): string | null {
  const base = apiBase();
  if (!base) return null;
  const q = new URLSearchParams({ eventId });
  return `${base}/api/mobile/planning/do-not-play-notes?${q.toString()}`;
}

export async function getDoNotPlayNotes(eventId: string): Promise<DoNotPlayNotesGet> {
  const url = notesUrl(eventId);
  if (!url) return { ok: false, unavailable: true, forbidden: false };
  try {
    const res = await authorizedFetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return { ok: false, unavailable: true, forbidden: false };
    if (res.status === 403) return { ok: false, unavailable: false, forbidden: true };
    if (!res.ok) return { ok: false, unavailable: false, forbidden: false };
    const json = (await res.json().catch(() => ({}))) as { text?: string | null };
    return { ok: true, text: json.text ?? null };
  } catch {
    return { ok: false, unavailable: false, forbidden: false };
  }
}

export async function saveDoNotPlayNotes(eventId: string, text: string | null): Promise<SectionNotesSave> {
  const url = notesUrl(eventId);
  if (!url) return 'unavailable';
  try {
    const res = await authorizedFetch(url, {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.status === 404) return 'unavailable';
    if (res.status === 403) return 'forbidden';
    if (!res.ok) return 'failed';
    return 'saved';
  } catch {
    return 'failed';
  }
}
