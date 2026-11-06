import { asRecord, mobileJson, type MobileFailure } from '@/lib/mobileJson';
import type { Group, Overview, SectionRow } from '@/lib/planning';

export type GuestAccessSection = {
  id: string;
  title: string;
  guestEnabled: boolean;
};

/** Do-not-play lists stay with the couple and the DJ. */
export function isDoNotPlayTitle(title: string): boolean {
  return /do\s*n[o']?t\s*play|dont\s*play/i.test(title);
}

/** Guests only see sections the host marked open, and never a do-not-play list. */
export function restrictGuestOverview(overview: Overview): Overview {
  const sections = overview.sections.filter((section) => section.guest_enabled === true && !isDoNotPlayTitle(section.title));
  const groups = overview.groups
    .map((group) => recount(group, group.sections.filter((section) => section.guest_enabled === true && !isDoNotPlayTitle(section.title))))
    .filter((group) => group.sections.length > 0);
  return {
    ...overview,
    groups,
    sections,
    removed: [],
    totalQuestions: sections.reduce((sum, section) => sum + section.questionCount, 0),
    answeredQuestions: sections.reduce((sum, section) => sum + section.answeredCount, 0),
  };
}

export function sectionClosedToGuest(section: { title?: string | null; guest_enabled?: boolean | null } | null): boolean {
  if (!section) return true;
  if (section.guest_enabled !== true) return true;
  return isDoNotPlayTitle(section.title ?? '');
}

/**
 * GET /api/mobile/events/:eventId/guest-access
 * 200: { sections: [{ id, title, guestEnabled }] }
 * Host, or staff who can view events. Guests get 403.
 */
export async function listGuestAccess(eventId: string): Promise<{ ok: true; sections: GuestAccessSection[] } | MobileFailure> {
  const result = await mobileJson('GET', `/api/mobile/events/${encodeURIComponent(eventId)}/guest-access`);
  if (!result.ok) return result;
  const rows = asRecord(result.data).sections;
  const sections = Array.isArray(rows) ? rows.map(parseSection).filter((row): row is GuestAccessSection => !!row) : [];
  return { ok: true, sections };
}

/**
 * PUT /api/mobile/events/:eventId/guest-access
 * body: { sectionId, guestEnabled }
 * 200: { ok: true, sectionId, guestEnabled }
 */
export async function setGuestAccess(
  eventId: string,
  sectionId: string,
  guestEnabled: boolean,
): Promise<{ ok: true; sectionId: string; guestEnabled: boolean } | MobileFailure> {
  const result = await mobileJson('PUT', `/api/mobile/events/${encodeURIComponent(eventId)}/guest-access`, {
    sectionId,
    guestEnabled,
  });
  if (!result.ok) return result;
  const record = asRecord(result.data);
  return {
    ok: true,
    sectionId: typeof record.sectionId === 'string' ? record.sectionId : sectionId,
    guestEnabled: record.guestEnabled === true,
  };
}

function parseSection(value: unknown): GuestAccessSection | null {
  const row = asRecord(value);
  if (typeof row.id !== 'string') return null;
  return {
    id: row.id,
    title: typeof row.title === 'string' ? row.title : '',
    guestEnabled: row.guestEnabled === true,
  };
}

function recount(group: Group, sections: SectionRow[]): Group {
  return {
    ...group,
    sections,
    totalQuestions: sections.reduce((sum, section) => sum + section.questionCount, 0),
    answeredQuestions: sections.reduce((sum, section) => sum + section.answeredCount, 0),
    songCount: sections.reduce((sum, section) => sum + section.songCount, 0),
    aiPicks: sections.some((section) => section.ai_picks_enabled),
  };
}
