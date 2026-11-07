/** What the moment screen may show for a couple note.
    The moderated content feed is the only source that can seed the text.
    A failed feed must not be filled from planning_sections.client_notes. */

export type FeedSectionNote = {
  notes: string | null;
  hidden: boolean;
};

export type NoteSeed = {
  /** True when the feed answered. The moment must not load another copy of the note. */
  skipLoad: boolean;
  /** Moderated text. Null only when the feed did not answer, and then it must not be shown. */
  text: string | null;
};

export function noteSeedFromFeed(
  feed: { ok: true; note: FeedSectionNote | null } | { ok: false },
): NoteSeed {
  if (!feed.ok) return { skipLoad: false, text: null };
  const note = feed.note;
  if (!note) return { skipLoad: true, text: '' };
  if (note.hidden && note.notes) return { skipLoad: true, text: note.notes };
  if (note.hidden || note.notes == null) return { skipLoad: true, text: '' };
  return { skipLoad: true, text: note.notes };
}

/** Cover photo for the home hero. A failed or hidden feed shows no photo. */
export function visibleCoverUrl(
  feed: { ok: true; url: string | null; hidden: boolean } | { ok: false },
): string | null {
  if (!feed.ok || feed.hidden) return null;
  return feed.url;
}
