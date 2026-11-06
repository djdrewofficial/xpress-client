import { roleForEvent } from '@/lib/membership';
import { asRecord, mobileJson } from '@/lib/mobileJson';
import type { Group, Overview, SectionRow } from '@/lib/planning';

export type GuestSectionList = { ready: true; sectionIds: string[] } | { ready: false };

const cache = new Map<string, { at: number; value: GuestSectionList }>();
const TTL_MS = 15000;

/**
 * Sections a guest may see.
 *
 * Expected contract (align with the XOS event-link PR):
 * GET /api/mobile/events/:eventId/guest-sections
 * 200: { sectionIds: string[] }
 *
 * An empty list means the guest sees no sections.
 * 404, 405, 501, 503, or a network failure means the route is not live yet, and the
 * caller leaves the plan unfiltered so a missing route does not blank the event.
 * Any other error hides the plan.
 */
export async function loadGuestOpenSections(eventId: string): Promise<GuestSectionList> {
  const hit = cache.get(eventId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const result = await mobileJson('GET', `/api/mobile/events/${encodeURIComponent(eventId)}/guest-sections`);
  let value: GuestSectionList;
  if (!result.ok) {
    const missing = result.status === 0 || result.status === 404 || result.status === 405 || result.status === 501 || result.status === 503;
    value = missing ? { ready: false } : { ready: true, sectionIds: [] };
  } else {
    const record = asRecord(result.data);
    const sectionIds = Array.isArray(record.sectionIds)
      ? record.sectionIds.filter((id): id is string => typeof id === 'string')
      : [];
    value = { ready: true, sectionIds };
  }
  cache.set(eventId, { at: Date.now(), value });
  return value;
}

export function clearGuestSectionCache() {
  cache.clear();
}

export async function guestCanSeeSection(eventId: string, sectionId: string): Promise<boolean> {
  if (roleForEvent(eventId) !== 'guest') return true;
  const open = await loadGuestOpenSections(eventId);
  if (!open.ready) return true;
  return open.sectionIds.includes(sectionId);
}

export function applyGuestAllowList(overview: Overview, sectionIds: string[]): Overview {
  const allow = new Set(sectionIds);
  const sections = overview.sections.filter((section) => allow.has(section.id));
  const groups = overview.groups
    .map((group) => recount(group, group.sections.filter((section) => allow.has(section.id))))
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
