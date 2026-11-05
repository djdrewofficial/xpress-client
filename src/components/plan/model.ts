import { formatEventEyebrow } from '@/lib/eventDate';
import { translate, type Locale } from '@/lib/i18n';
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

export function momentEyebrow(n: number | null, time: string | null, locale: Locale = 'en'): string {
  const code = n == null ? translate(locale, 'moment.eyebrow') : translate(locale, 'moment.eyebrowN', { n: String(n).padStart(2, '0') });
  return time?.trim() ? `${code}  ·  ${time.trim()}` : code;
}

export function greeting(firstName?: string | null, locale: Locale = 'en'): string {
  const h = new Date().getHours();
  const part = translate(locale, h < 12 ? 'home.greetMorning' : h < 17 ? 'home.greetAfternoon' : 'home.greetEvening');
  return firstName?.trim() ? `${part}, ${firstName.trim().toUpperCase()}` : part;
}

/** "SAT · JUNE 13, 2027" / "SAB · 13 JUN 2027". */
export function heroDateLabel(date: string, locale: Locale = 'en'): string {
  return formatEventEyebrow(date, locale).replace(' · ', '  ·  ');
}

/** Chapter badge: question progress inside the chapter. "Done" when every question is answered. */
export function chapterStatus(group: Pick<Group, 'totalQuestions' | 'answeredQuestions'>, locale: Locale = 'en'): { label: string; done: boolean } | null {
  if (group.totalQuestions <= 0) return null;
  if (group.answeredQuestions >= group.totalQuestions) return { label: translate(locale, 'home.done'), done: true };
  return { label: translate(locale, 'home.of', { answered: group.answeredQuestions, total: group.totalQuestions }), done: false };
}

export function answerText(q: QuestionRow, raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (q.answer_type === 'multiselect') return v.split('|').filter(Boolean).join(', ');
  return v;
}
