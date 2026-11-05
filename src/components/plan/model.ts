import type { Group, QuestionRow, SectionRow } from '@/lib/planning';

/**
 * Dance-floor moment — the only place "Do not play" is shown.
 *
 * Rule (same title signals the onboarding first-song step already uses, and
 * only sections that can hold songs):
 *   1. title matches /dancing playlist/i
 *   2. else /open dancing/i
 *   3. else /dance floor/i (space optional)
 *   4. else /\bdancing\b/i
 * "First Dance", "Parent Dance", and "Anniversary Dance" do not match.
 * Songs stay where they are stored: `planning_songs.do_not_play`, usually on
 * the section whose title matches /do not play|don't play|dont play/i.
 */
export function isDanceFloorSection(s: Pick<SectionRow, 'title' | 'songs_enabled'>): boolean {
  if (!s.songs_enabled) return false;
  const t = s.title;
  return /dancing playlist/i.test(t) || /open dancing/i.test(t) || /dance ?floor/i.test(t) || /\bdancing\b/i.test(t);
}

/** Legacy list whose rows are the do-not-play songs. We read and write it; we do not move rows. */
export function isDoNotPlaySection(s: Pick<SectionRow, 'title'>): boolean {
  return /do ?not play|don'?t play|dont play/i.test(s.title);
}

/** The one dance-floor section to link to, using the same priority as onboarding. */
export function findDanceFloor(sections: SectionRow[]): SectionRow | null {
  const music = sections.filter((s) => s.songs_enabled);
  return (
    music.find((s) => /dancing playlist/i.test(s.title)) ??
    music.find((s) => /open dancing/i.test(s.title)) ??
    music.find((s) => /dance ?floor/i.test(s.title)) ??
    music.find((s) => /\bdancing\b/i.test(s.title)) ??
    null
  );
}

export function momentNumber(sections: Pick<SectionRow, 'id'>[], sectionId: string): number | null {
  const i = sections.findIndex((s) => s.id === sectionId);
  return i >= 0 ? i + 1 : null;
}

export function momentEyebrow(n: number | null, time: string | null): string {
  const code = n == null ? 'MOMENT' : `MOMENT ${String(n).padStart(2, '0')}`;
  return time?.trim() ? `${code}  ·  ${time.trim()}` : code;
}

export function greeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  return firstName?.trim() ? `${part}, ${firstName.trim().toUpperCase()}` : part;
}

/** "SAT · JUNE 13, 2027" */
export function heroDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const wk = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return `${wk}  ·  ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Chapter badge: question progress inside the chapter. "Done" when every question is answered. */
export function chapterStatus(group: Pick<Group, 'totalQuestions' | 'answeredQuestions'>): { label: string; done: boolean } | null {
  if (group.totalQuestions <= 0) return null;
  if (group.answeredQuestions >= group.totalQuestions) return { label: 'Done', done: true };
  return { label: `${group.answeredQuestions} of ${group.totalQuestions}`, done: false };
}

export function editedAgo(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'edited today';
  if (days === 1) return 'edited yesterday';
  return `edited ${days} days ago`;
}

export function answerText(q: QuestionRow, raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (q.answer_type === 'multiselect') return v.split('|').filter(Boolean).join(', ');
  return v;
}

/** Prose rollup of answers already saved. Not a new field — just the answers, joined. */
export function composeDjNote(
  questions: QuestionRow[],
  answers: Record<string, string>,
): { text: string; edited: string | null } | null {
  const bits: string[] = [];
  let latest: string | null = null;
  for (const q of questions) {
    const text = answerText(q, answers[q.id] ?? '');
    if (!text) continue;
    bits.push(text);
    if (q.updated_at && (!latest || q.updated_at > latest)) latest = q.updated_at;
  }
  if (!bits.length) return null;
  return { text: bits.join('. '), edited: editedAgo(latest) };
}
