import { supabase } from '@/lib/supabase';

export type EventLite = { id: string; name: string; event_date: string | null; cover_photo_url: string | null };

export type SectionRow = {
  id: string;
  title: string;
  icon: string | null;
  section_type: 'info' | 'timeline' | 'headline';
  module: string | null;
  songs_enabled: boolean;
  questions_enabled: boolean;
  ai_picks_enabled: boolean;
  song_limit: number | null;
  sort_order: number;
  questionCount: number;
  answeredCount: number;
  songCount: number;
};

export type Group = {
  id: string;
  title: string;
  icon: string | null;
  sections: SectionRow[];
  totalQuestions: number;
  answeredQuestions: number;
  songCount: number;
  aiPicks: boolean;
};

export type Overview = {
  groups: Group[];
  sections: SectionRow[]; // flat content sections (non-headline)
  totalQuestions: number;
  answeredQuestions: number;
};

export type QuestionRow = {
  id: string;
  prompt: string;
  help_text: string | null;
  answer_type: string;
  options: (string | { label: string; image?: string | null })[];
  answer: string | null;
  condition_question_id: string | null;
  condition_values: string[];
};

export type SongRow = {
  id: string;
  title: string;
  artist: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  must_play: boolean;
};

/** Events this client/guest can plan. */
export async function getMyEvents(account: { clientId: string | null; eventGuestId: string | null }): Promise<EventLite[]> {
  if (account.clientId) {
    const [{ data: primary }, { data: linked }] = await Promise.all([
      supabase.from('events').select('id, name, event_date, cover_photo_url').eq('client_id', account.clientId).is('archived_at', null),
      supabase.from('event_clients').select('event:events(id, name, event_date, cover_photo_url, archived_at)').eq('client_id', account.clientId),
    ]);
    const seen = new Set<string>();
    const out: EventLite[] = [];
    for (const e of primary ?? []) if (!seen.has(e.id)) { seen.add(e.id); out.push(e as EventLite); }
    for (const row of linked ?? []) {
      const e = (row as unknown as { event: (EventLite & { archived_at: string | null }) | null }).event;
      if (e && !e.archived_at && !seen.has(e.id)) { seen.add(e.id); out.push(e); }
    }
    return out.sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? ''));
  }
  if (account.eventGuestId) {
    const { data: g } = await supabase
      .from('event_guests')
      .select('event:events(id, name, event_date, cover_photo_url)')
      .eq('id', account.eventGuestId)
      .maybeSingle();
    const e = (g as unknown as { event: EventLite | null } | null)?.event;
    return e ? [e] : [];
  }
  return [];
}

/** Section list + progress for the home screen. */
export async function loadOverview(eventId: string): Promise<Overview> {
  const [{ data: sections }, { data: questions }, { data: answers }, { data: songs }] = await Promise.all([
    supabase.from('planning_sections').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('planning_questions').select('id, section_id').eq('event_id', eventId),
    supabase.from('planning_question_answers').select('question_id, answer').eq('event_id', eventId),
    supabase.from('planning_songs').select('id, section_id').eq('event_id', eventId),
  ]);

  const answered = new Set((answers ?? []).filter((a) => (a.answer ?? '').trim() !== '').map((a) => a.question_id));
  const qBySection = new Map<string, string[]>();
  for (const q of questions ?? []) {
    const list = qBySection.get(q.section_id) ?? [];
    list.push(q.id);
    qBySection.set(q.section_id, list);
  }
  const songBySection = new Map<string, number>();
  for (const s of songs ?? []) songBySection.set(s.section_id, (songBySection.get(s.section_id) ?? 0) + 1);

  let totalQuestions = 0;
  let answeredQuestions = 0;
  const flat: SectionRow[] = [];
  const groups: Group[] = [];
  let current: Group | null = null;

  const ensureGroup = (): Group => {
    if (!current) {
      current = { id: 'start', title: 'Your plan', icon: '✨', sections: [], totalQuestions: 0, answeredQuestions: 0, songCount: 0, aiPicks: false };
      groups.push(current);
    }
    return current;
  };

  for (const s of sections ?? []) {
    if (s.section_type === 'headline') {
      current = { id: s.id, title: s.title, icon: s.icon, sections: [], totalQuestions: 0, answeredQuestions: 0, songCount: 0, aiPicks: false };
      groups.push(current);
      continue;
    }
    const qs = qBySection.get(s.id) ?? [];
    const ans = qs.filter((id) => answered.has(id)).length;
    const songCount = songBySection.get(s.id) ?? 0;
    const row: SectionRow = {
      ...(s as Omit<SectionRow, 'questionCount' | 'answeredCount' | 'songCount'>),
      questionCount: qs.length,
      answeredCount: ans,
      songCount,
    };
    flat.push(row);
    totalQuestions += qs.length;
    answeredQuestions += ans;
    const g = ensureGroup();
    g.sections.push(row);
    g.totalQuestions += qs.length;
    g.answeredQuestions += ans;
    g.songCount += songCount;
    if (row.ai_picks_enabled) g.aiPicks = true;
  }

  return { groups: groups.filter((g) => g.sections.length > 0), sections: flat, totalQuestions, answeredQuestions };
}

export async function loadSection(eventId: string, sectionId: string): Promise<{ questions: QuestionRow[]; songs: SongRow[] }> {
  const [{ data: questions }, { data: answers }, { data: songs }] = await Promise.all([
    supabase.from('planning_questions').select('*').eq('section_id', sectionId).order('sort_order'),
    supabase.from('planning_question_answers').select('question_id, answer').eq('event_id', eventId),
    supabase.from('planning_songs').select('id, title, artist, artwork_url, preview_url, must_play').eq('section_id', sectionId).order('sort_order'),
  ]);
  const ansMap = new Map((answers ?? []).map((a) => [a.question_id, a.answer]));
  return {
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      help_text: q.help_text,
      answer_type: q.answer_type,
      options: Array.isArray(q.options) ? q.options : [],
      answer: ansMap.get(q.id) ?? null,
      condition_question_id: q.condition_question_id ?? null,
      condition_values: Array.isArray(q.condition_values) ? q.condition_values : [],
    })),
    songs: (songs ?? []) as SongRow[],
  };
}

export async function saveAnswer(eventId: string, questionId: string, answer: string, userId: string): Promise<void> {
  await supabase
    .from('planning_question_answers')
    .upsert({ question_id: questionId, event_id: eventId, answer, answered_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'question_id' });
}

/** Add a song to a section (used by For You + search + import). Returns the new row. */
export async function addSong(
  eventId: string,
  sectionId: string,
  song: {
    title: string;
    artist?: string | null;
    artwork_url?: string | null;
    preview_url?: string | null;
    album?: string | null;
    external_url?: string | null;
    provider?: 'spotify' | 'apple' | 'youtube' | 'manual';
    provider_id?: string | null;
  },
): Promise<SongRow | null> {
  const { count } = await supabase
    .from('planning_songs')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', sectionId);
  const { data, error } = await supabase
    .from('planning_songs')
    .insert({
      event_id: eventId,
      section_id: sectionId,
      title: song.title,
      artist: song.artist ?? null,
      album: song.album ?? null,
      artwork_url: song.artwork_url ?? null,
      preview_url: song.preview_url ?? null,
      external_url: song.external_url ?? null,
      provider: song.provider ?? 'manual',
      provider_id: song.provider_id ?? null,
      must_play: false,
      sort_order: count ?? 0,
    })
    .select('id, title, artist, artwork_url, preview_url, must_play')
    .single();
  if (error) throw error;
  return (data as SongRow) ?? null;
}

export function questionVisible(q: QuestionRow, answers: Record<string, string>): boolean {
  if (!q.condition_question_id) return true;
  const ctrl = answers[q.condition_question_id];
  if (ctrl == null) return true;
  if (q.condition_values.length === 0) return ctrl.trim() !== '';
  const parts = ctrl.split('|');
  return q.condition_values.some((v) => parts.includes(v) || ctrl === v);
}
