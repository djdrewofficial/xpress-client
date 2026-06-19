import { supabase } from '@/lib/supabase';

/**
 * AI song recommendations grounded in the couple's own words.
 *
 * The couple's "About Us" + "Cultural Influence" answers (collected as planning
 * questions) become the context we hand to the model so picks feel personal —
 * not a generic top-40 list. The model call itself lives server-side in XOS
 * (keeps the OpenAI key off the device); this module gathers the context,
 * calls that endpoint with the user's Supabase session, and shapes the result.
 */

export type RecommendedSong = {
  id: string;
  title: string;
  artist: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  /** One-line "why this fits you" the model returns. */
  reason: string | null;
};

export type CoupleContext = {
  eventName: string;
  aboutUs: string;
  culturalInfluence: string;
  /** Any other free-text answers that hint at taste (favorite genres, vibe, etc.). */
  extras: string[];
  /** Human-readable signals used, for a "Because you love…" line. */
  basis: string[];
};

export type RecResult =
  | { status: 'ok'; songs: RecommendedSong[]; basis: string[] }
  | { status: 'needs-profile' }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string };

const ABOUT_KEYS = ['about us', 'about you', 'your story', 'how did you meet', 'tell us about'];
const CULTURE_KEYS = ['cultur', 'heritage', 'background', 'tradition', 'ethnic', 'religio', 'language'];
const TASTE_KEYS = ['genre', 'music', 'artist', 'song', 'vibe', 'favorite', 'love to', 'dance'];

function matchAnswer(prompt: string, answer: string, keys: string[]): boolean {
  const p = prompt.toLowerCase();
  return answer.trim() !== '' && keys.some((k) => p.includes(k));
}

/** Gather the couple's self-description from their planning answers. */
export async function loadCoupleContext(eventId: string, eventName: string): Promise<CoupleContext> {
  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from('planning_questions').select('id, prompt').eq('event_id', eventId),
    supabase.from('planning_question_answers').select('question_id, answer').eq('event_id', eventId),
  ]);
  const ansById = new Map((answers ?? []).map((a) => [a.question_id, (a.answer ?? '').trim()]));

  let aboutUs = '';
  let culturalInfluence = '';
  const extras: string[] = [];
  const basis: string[] = [];

  for (const q of questions ?? []) {
    const a = ansById.get(q.id) ?? '';
    if (!a) continue;
    if (!aboutUs && matchAnswer(q.prompt, a, ABOUT_KEYS)) {
      aboutUs = a;
      basis.push('your story');
    } else if (!culturalInfluence && matchAnswer(q.prompt, a, CULTURE_KEYS)) {
      culturalInfluence = a;
      basis.push('your cultural roots');
    } else if (matchAnswer(q.prompt, a, TASTE_KEYS)) {
      extras.push(`${q.prompt}: ${a}`);
    }
  }
  if (extras.length) basis.push('your music taste');

  return { eventName, aboutUs, culturalInfluence, extras, basis };
}

/** True once we have enough to personalize. */
export function hasContext(ctx: CoupleContext): boolean {
  return ctx.aboutUs !== '' || ctx.culturalInfluence !== '' || ctx.extras.length > 0;
}

/**
 * Fetch AI picks for a moment (e.g. "Grand Entrance"). Falls back gracefully
 * when the couple hasn't filled in their profile or the API isn't configured.
 */
export async function getRecommendations(opts: {
  eventId: string;
  eventName: string;
  sectionTitle: string;
  limit?: number;
}): Promise<RecResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) return { status: 'unconfigured' };

  const ctx = await loadCoupleContext(opts.eventId, opts.eventName);
  if (!hasContext(ctx)) return { status: 'needs-profile' };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { status: 'error', message: 'Not signed in' };

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/music/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        eventId: opts.eventId,
        section: opts.sectionTitle,
        limit: opts.limit ?? 8,
        // Drew's call: favor well-known, high-confidence floor-fillers tailored to
        // their vibe over deep cuts. The endpoint's prompt should weight popularity.
        style: 'familiar',
        context: {
          eventName: ctx.eventName,
          aboutUs: ctx.aboutUs,
          culturalInfluence: ctx.culturalInfluence,
          extras: ctx.extras,
        },
      }),
    });
    if (!res.ok) return { status: 'error', message: `Server returned ${res.status}` };
    const json = (await res.json()) as { songs?: RecommendedSong[] };
    return { status: 'ok', songs: json.songs ?? [], basis: ctx.basis };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Network error' };
  }
}
