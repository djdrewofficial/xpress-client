import { mobileJson } from '@/lib/mobileJson';

/** Event content controls from XOS PR 48.
    Reports, blocks, soft hide, and guest removal. Errors are JSON { error }. */

export const REPORT_REASONS = ['offensive', 'spam', 'harassment', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ContentTargetType =
  | 'song'
  | 'song_like'
  | 'answer'
  | 'section_note'
  | 'do_not_play_note'
  | 'song_idea'
  | 'cover_photo'
  | 'booth_selection'
  | 'timeline_file'
  | 'user';

export type ModerationTarget = {
  targetType: ContentTargetType;
  targetId?: string | null;
  targetUserId?: string | null;
};

export type ModerationKind =
  | 'unavailable'
  | 'forbidden'
  | 'notFound'
  | 'self'
  | 'ownOnly'
  | 'guestOnly'
  | 'onlyGuest'
  | 'invalid'
  | 'failed'
  | 'session';

export type ModerationFailure = { ok: false; kind: ModerationKind; status: number };

export type ReportResult = {
  id: string | null;
  alreadyReported: boolean;
};

export type BlockResult = { userId: string; alreadyBlocked: boolean };
export type HideResult = { targetType: string; targetId: string; hiddenAt: string | null };
export type GuestRemoval = { userId: string; access: 'none' | 'other' };

export type EventSong = {
  id: string;
  sectionId: string | null;
  title: string;
  artist: string | null;
  note: string | null;
  requestedBy: string | null;
  hidden: boolean;
};

export type EventLike = { songId: string; userId: string; hidden: boolean };
export type EventAnswer = { questionId: string; answer: string | null; answeredBy: string | null; hidden: boolean };
export type EventSectionNote = { sectionId: string; notes: string | null; updatedBy: string | null; hidden: boolean };
export type EventText = { text: string | null; updatedBy: string | null; hidden: boolean };
export type EventSongIdea = {
  id: string;
  title: string;
  artist: string | null;
  note: string | null;
  addedBy: string | null;
  hidden: boolean;
};
export type EventCover = { url: string | null; updatedBy: string | null; hidden: boolean };
export type EventBooth = { backdropId: string | null; updatedBy: string | null; hidden: boolean };
export type EventFile = { id: string; name: string | null; uploadedBy: string | null; hidden: boolean };

export type EventContent = {
  songs: EventSong[];
  likes: EventLike[];
  answers: EventAnswer[];
  sectionNotes: EventSectionNote[];
  doNotPlayNotes: EventText | null;
  songIdeas: EventSongIdea[];
  coverPhoto: EventCover | null;
  boothSelection: EventBooth | null;
  timelineFile: EventFile | null;
};

const OWN_ONLY = 'You can only remove your own content.';
const GUEST_ONLY = "You can only remove a guest's content or your own.";
const ONLY_GUEST = 'Only a guest can be removed.';
const SELF_REPORT = "You can't report yourself.";
const SELF_BLOCK = "You can't block yourself.";

export function personTag(userId: string): string {
  return userId.replace(/-/g, '').slice(-4).toLowerCase();
}

function classify(status: number, error: string): ModerationKind {
  if (status === 503) return 'unavailable';
  if (status === 401) return 'session';
  if (error === SELF_REPORT || error === SELF_BLOCK) return 'self';
  if (error === OWN_ONLY) return 'ownOnly';
  if (error === GUEST_ONLY) return 'guestOnly';
  if (error === ONLY_GUEST) return 'onlyGuest';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 400) return 'invalid';
  if (status === 0) return 'failed';
  return 'failed';
}

function fail(status: number, error: string): ModerationFailure {
  return { ok: false, kind: classify(status, error), status };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function flag(value: unknown): boolean {
  return value === true;
}

export async function submitReport(
  eventId: string,
  target: ModerationTarget,
  reason: ReportReason,
  details: string,
): Promise<{ ok: true; data: ReportResult } | ModerationFailure> {
  const body: Record<string, unknown> = {
    targetType: target.targetType,
    reason,
  };
  if (target.targetType !== 'user' && target.targetId) body.targetId = target.targetId;
  if (target.targetUserId) body.targetUserId = target.targetUserId;
  const trimmed = details.trim();
  if (trimmed) body.details = trimmed.slice(0, 1000);
  const res = await mobileJson('POST', `/api/mobile/events/${eventId}/reports`, body);
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data);
  return {
    ok: true,
    data: {
      id: str(row?.id),
      alreadyReported: row?.alreadyReported === true,
    },
  };
}

export async function blockPerson(
  eventId: string,
  userId: string,
): Promise<{ ok: true; data: BlockResult } | ModerationFailure> {
  const res = await mobileJson('POST', `/api/mobile/events/${eventId}/blocks`, { userId });
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data);
  return {
    ok: true,
    data: {
      userId: str(row?.userId) ?? userId,
      alreadyBlocked: row?.alreadyBlocked === true,
    },
  };
}

export async function listBlocks(
  eventId: string,
): Promise<{ ok: true; data: string[] } | ModerationFailure> {
  const res = await mobileJson('GET', `/api/mobile/events/${eventId}/blocks`);
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data);
  const ids = Array.isArray(row?.blockedUserIds) ? row.blockedUserIds.filter((id): id is string => typeof id === 'string') : [];
  return { ok: true, data: ids };
}

export async function unblockPerson(
  eventId: string,
  userId: string,
): Promise<{ ok: true; userId: string } | ModerationFailure> {
  const res = await mobileJson('DELETE', `/api/mobile/events/${eventId}/blocks/${encodeURIComponent(userId)}`);
  if (!res.ok) return fail(res.status, res.error);
  return { ok: true, userId };
}

export async function hideContent(
  eventId: string,
  target: ModerationTarget,
): Promise<{ ok: true; data: HideResult } | ModerationFailure> {
  const body: Record<string, unknown> = { targetType: target.targetType };
  if (target.targetId) body.targetId = target.targetId;
  if (target.targetUserId) body.targetUserId = target.targetUserId;
  const res = await mobileJson('POST', `/api/mobile/events/${eventId}/content/hide`, body);
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data);
  return {
    ok: true,
    data: {
      targetType: str(row?.targetType) ?? target.targetType,
      targetId: str(row?.targetId) ?? target.targetId ?? '',
      hiddenAt: str(row?.hiddenAt),
    },
  };
}

export async function removeEventGuest(
  eventId: string,
  userId: string,
): Promise<{ ok: true; data: GuestRemoval } | ModerationFailure> {
  const res = await mobileJson('DELETE', `/api/mobile/events/${eventId}/guests/${encodeURIComponent(userId)}`);
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data);
  return {
    ok: true,
    data: {
      userId: str(row?.userId) ?? userId,
      access: row?.access === 'other' ? 'other' : 'none',
    },
  };
}

function song(value: unknown): EventSong | null {
  const row = asRecord(value);
  const id = str(row?.id);
  if (!row || !id) return null;
  return {
    id,
    sectionId: str(row.sectionId),
    title: str(row.title) ?? '',
    artist: str(row.artist),
    note: str(row.note),
    requestedBy: str(row.requestedBy),
    hidden: flag(row.hidden),
  };
}

function like(value: unknown): EventLike | null {
  const row = asRecord(value);
  const songId = str(row?.songId);
  const userId = str(row?.userId);
  if (!songId || !userId) return null;
  return { songId, userId, hidden: flag(row?.hidden) };
}

export async function loadEventContent(
  eventId: string,
): Promise<{ ok: true; data: EventContent } | ModerationFailure> {
  const res = await mobileJson('GET', `/api/mobile/events/${eventId}/content`);
  if (!res.ok) return fail(res.status, res.error);
  const row = asRecord(res.data) ?? {};
  const notes = asRecord(row.doNotPlayNotes);
  const cover = asRecord(row.coverPhoto);
  const booth = asRecord(row.boothSelection);
  const file = asRecord(row.timelineFile);
  return {
    ok: true,
    data: {
      songs: Array.isArray(row.songs) ? row.songs.map(song).filter((item): item is EventSong => item != null) : [],
      likes: Array.isArray(row.likes) ? row.likes.map(like).filter((item): item is EventLike => item != null) : [],
      answers: Array.isArray(row.answers)
        ? row.answers.flatMap((item) => {
            const answer = asRecord(item);
            const questionId = str(answer?.questionId);
            if (!questionId) return [];
            return [{
              questionId,
              answer: typeof answer?.answer === 'string' ? answer.answer : null,
              answeredBy: str(answer?.answeredBy),
              hidden: flag(answer?.hidden),
            }];
          })
        : [],
      sectionNotes: Array.isArray(row.sectionNotes)
        ? row.sectionNotes.flatMap((item) => {
            const note = asRecord(item);
            const sectionId = str(note?.sectionId);
            if (!sectionId) return [];
            return [{
              sectionId,
              notes: typeof note?.notes === 'string' ? note.notes : null,
              updatedBy: str(note?.updatedBy),
              hidden: flag(note?.hidden),
            }];
          })
        : [],
      doNotPlayNotes: notes
        ? { text: typeof notes.text === 'string' ? notes.text : null, updatedBy: str(notes.updatedBy), hidden: flag(notes.hidden) }
        : null,
      songIdeas: Array.isArray(row.songIdeas)
        ? row.songIdeas.flatMap((item) => {
            const idea = asRecord(item);
            const id = str(idea?.id);
            if (!id) return [];
            return [{
              id,
              title: str(idea?.title) ?? '',
              artist: str(idea?.artist),
              note: str(idea?.note),
              addedBy: str(idea?.addedBy),
              hidden: flag(idea?.hidden),
            }];
          })
        : [],
      coverPhoto: cover
        ? { url: str(cover.url), updatedBy: str(cover.updatedBy), hidden: flag(cover.hidden) }
        : null,
      boothSelection: booth
        ? { backdropId: str(booth.backdropId), updatedBy: str(booth.updatedBy), hidden: flag(booth.hidden) }
        : null,
      timelineFile: file
        ? { id: str(file.id) ?? '', name: str(file.name), uploadedBy: str(file.uploadedBy), hidden: flag(file.hidden) }
        : null,
    },
  };
}
