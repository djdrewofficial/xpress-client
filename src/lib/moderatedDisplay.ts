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

export type CoverAuthor = { userId: string; label: string | null };

export type CoverView = {
  eventId: string | null;
  url: string | null;
  author: CoverAuthor | null;
};

/** Drop the previous event's photo as soon as the open event changes. A refresh of the same event keeps the current photo until the new read returns. */
export function coverOnScope(previous: CoverView, eventId: string | null): CoverView {
  if (previous.eventId === eventId) return previous;
  return { eventId, url: null, author: null };
}

export type CoverFeed =
  | { ok: true; url: string | null; hidden: boolean; updatedBy: string | null; updatedByLabel: string | null }
  | { ok: false };

/** Ignore a response that belongs to an older event or an unmounted request. */
export function coverFromFeed(
  current: CoverView,
  request: { eventId: string | null; active: boolean },
  feed: CoverFeed,
): CoverView {
  if (!request.active || current.eventId !== request.eventId) return current;
  if (!feed.ok) return { eventId: request.eventId, url: null, author: null };
  const url = visibleCoverUrl(feed);
  const author = url && feed.updatedBy ? { userId: feed.updatedBy, label: feed.updatedByLabel } : null;
  return { eventId: request.eventId, url, author };
}
