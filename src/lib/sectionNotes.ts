import { apiBase, authHeader } from '@/lib/api';

/* Free-text notes for one planning section.
   GET/PUT /api/mobile/planning/sections/{id}/notes
   Couples and guests receive { notes }. Staff also receive { staffNotes }.
   PUT body is { notes?, staffNotes? }. Blank text is stored as null.
   Guests cannot write (403). A 404 means the route is not deployed yet. */

export const NOTE_MAX = 4000;

/** Trim, drop blanks, and cap length. Matches the XOS notes contract. */
export function normalizeNoteText(value: string): string | null {
  const trimmed = value.trim().slice(0, NOTE_MAX);
  return trimmed ? trimmed : null;
}

export type SectionNotes = {
  notes: string | null;
  /** Present only when the caller is staff. */
  staffNotes?: string | null;
};

export type SectionNotesGet =
  | { ok: true; notes: SectionNotes }
  | { ok: false; unavailable: boolean; forbidden: boolean };

export type SectionNotesSave = 'saved' | 'unavailable' | 'forbidden' | 'failed';

async function notesUrl(sectionId: string): Promise<string | null> {
  const base = apiBase();
  if (!base) return null;
  return `${base}/api/mobile/planning/sections/${encodeURIComponent(sectionId)}/notes`;
}

export async function getSectionNotes(sectionId: string): Promise<SectionNotesGet> {
  const url = await notesUrl(sectionId);
  if (!url) return { ok: false, unavailable: true, forbidden: false };
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', ...(await authHeader()) } });
    if (res.status === 404) return { ok: false, unavailable: true, forbidden: false };
    if (res.status === 403) return { ok: false, unavailable: false, forbidden: true };
    if (!res.ok) return { ok: false, unavailable: false, forbidden: false };
    const json = (await res.json().catch(() => ({}))) as { notes?: string | null; staffNotes?: string | null };
    const notes: SectionNotes = { notes: json.notes ?? null };
    if ('staffNotes' in json) notes.staffNotes = json.staffNotes ?? null;
    return { ok: true, notes };
  } catch {
    return { ok: false, unavailable: false, forbidden: false };
  }
}

export async function saveSectionNotes(
  sectionId: string,
  body: { notes?: string | null; staffNotes?: string | null },
): Promise<SectionNotesSave> {
  const url = await notesUrl(sectionId);
  if (!url) return 'unavailable';
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(body),
    });
    if (res.status === 404) return 'unavailable';
    if (res.status === 403) return 'forbidden';
    if (!res.ok) return 'failed';
    return 'saved';
  } catch {
    return 'failed';
  }
}
