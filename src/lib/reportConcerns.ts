/**
 * Event-level report concerns on My Event.
 * Each concern maps onto an existing `/api/mobile/events/:id/reports` targetType
 * so App Store UGC reporting stays available without per-question Report links.
 */

export const REPORT_CONCERNS = [
  'answers',
  'notes',
  'songs',
  'person',
  'cover',
  'other',
] as const;

export type ReportConcern = (typeof REPORT_CONCERNS)[number];

export type ConcernTarget = {
  targetType: 'answer' | 'section_note' | 'song' | 'user' | 'cover_photo';
  targetId?: string | null;
  targetUserId?: string | null;
};

const CONCERN_TARGET: Record<ReportConcern, ConcernTarget['targetType']> = {
  answers: 'answer',
  notes: 'section_note',
  songs: 'song',
  person: 'user',
  cover: 'cover_photo',
  /** Generic catch-all still uses the answer target type the old per-question flow used. */
  other: 'answer',
};

/**
 * Build the moderation target for an event-level report.
 * Specific song/answer ids are optional — free-text details carry the context.
 */
export function targetForConcern(
  concern: ReportConcern,
  opts?: { eventId?: string | null; personId?: string | null },
): ConcernTarget {
  const targetType = CONCERN_TARGET[concern];
  if (targetType === 'user') {
    return { targetType, targetUserId: opts?.personId ?? null };
  }
  if (targetType === 'cover_photo') {
    return { targetType, targetId: opts?.eventId ?? null };
  }
  return { targetType };
}
