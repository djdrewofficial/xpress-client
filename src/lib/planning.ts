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
  on_timeline: boolean | null; // per-event override; null = auto (on when section_type==='timeline')
  on_music: boolean | null; // per-event override; null = auto (vibe playlists: songs on + no single-song limit)
  time_enabled: boolean; // section supports a time
  time_label: string | null; // the time shown on the timeline, e.g. "5:00 PM"
  locked: boolean;
  questionCount: number;
  answeredCount: number;
  songCount: number;
};

/** Whether a section shows on the couple's client Timeline view (honours the
    per-event override, else defaults from its type — info sections stay off). */
export const onTimeline = (s: Pick<SectionRow, 'on_timeline' | 'section_type'>): boolean =>
  s.on_timeline ?? s.section_type === 'timeline';

/** Whether a section shows on the Music tab (vibe curation). Honours the staff
    override, else defaults to open playlists (songs on, no single-song limit). */
export const onMusic = (s: Pick<SectionRow, 'on_music' | 'songs_enabled' | 'song_limit'>): boolean =>
  s.on_music ?? (s.songs_enabled && s.song_limit == null);

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

export type RemovedSection = { id: string; title: string; icon: string | null };

export type Overview = {
  groups: Group[];
  sections: SectionRow[]; // flat content sections (non-headline)
  removed: RemovedSection[]; // host-deleted sections (restorable by staff/host)
  totalQuestions: number;
  answeredQuestions: number;
};

export type QuestionRow = {
  id: string;
  prompt: string;
  help_text: string | null;
  answer_type: string;
  options: (string | { label: string; image?: string | null; children?: string[] })[];
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
  do_not_play: boolean;
  note: string | null;
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

export type StaffEvent = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  cover_photo_url: string | null;
  clientName: string | null;
  status: { name: string; color: string | null; textColor: string | null } | null;
};

type StaffEventRow = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  cover_photo_url: string | null;
  client: { first_name: string | null; last_name: string | null } | null;
  status: { name: string; color: string | null; text_color: string | null } | null;
};

/** Upcoming events a staff member can open. Admins/sales see all; plain employees
    see only events they're assigned to (event_staff). No financials/contracts here. */
export async function getStaffEvents(opts: { employeeId: string | null; seesAll: boolean }): Promise<StaffEvent[]> {
  const cols =
    'id, name, event_date, start_time, cover_photo_url, client:clients(first_name, last_name), status:event_statuses(name, color, text_color)';
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from('events')
    .select(opts.seesAll ? cols : `${cols}, event_staff!inner(employee_id)`)
    .is('archived_at', null)
    .gte('event_date', today)
    .order('event_date', { ascending: true });
  if (!opts.seesAll) query = query.eq('event_staff.employee_id', opts.employeeId ?? '');

  const { data } = await query;
  const rows = (data ?? []) as unknown as StaffEventRow[];
  const seen = new Set<string>();
  const out: StaffEvent[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue; // event_staff!inner can duplicate an event across roles
    seen.add(r.id);
    out.push({
      id: r.id,
      name: r.name,
      event_date: r.event_date,
      start_time: r.start_time,
      cover_photo_url: r.cover_photo_url,
      clientName: r.client ? [r.client.first_name, r.client.last_name].filter(Boolean).join(' ') || null : null,
      status: r.status ? { name: r.status.name, color: r.status.color, textColor: r.status.text_color } : null,
    });
  }
  return out;
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
  const removed: RemovedSection[] = [];
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
    // Host-deleted sections drop out of the live plan but stay restorable.
    if (s.deleted_by_host_at) {
      if (s.section_type !== 'headline') removed.push({ id: s.id, title: s.title, icon: s.icon ?? null });
      continue;
    }
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

  return { groups: groups.filter((g) => g.sections.length > 0), sections: flat, removed, totalQuestions, answeredQuestions };
}

// ── Section management (staff + hosts) — writes go through an XOS admin route
//    because hosts can't write planning_sections under RLS. ────────────────────

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function sectionAction(body: Record<string, unknown>): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  try {
    const res = await fetch(`${base}/api/mobile/planning/sections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Reorder a set of sections (e.g. within a group). Staff + hosts. */
export const reorderSections = (eventId: string, orderedIds: string[]): Promise<boolean> =>
  sectionAction({ action: 'reorder', eventId, orderedIds });

/** Delete a section — staff permanent, host soft (restorable). */
export const deleteSection = (eventId: string, sectionId: string): Promise<boolean> =>
  sectionAction({ action: 'delete', eventId, sectionId });

/** Show/hide a section on the couple's client Timeline view (per-event only). */
export const setSectionOnTimeline = (eventId: string, sectionId: string, on: boolean): Promise<boolean> =>
  sectionAction({ action: 'set_timeline', eventId, sectionId, on });

/** Set or clear the time shown for a section (time_label). Pass null to clear. */
export const setSectionTime = (eventId: string, sectionId: string, time: string | null): Promise<boolean> =>
  sectionAction({ action: 'set_time', eventId, sectionId, time });

/** Restore a host-deleted section. Staff + hosts. */
export const restoreSection = (eventId: string, sectionId: string): Promise<boolean> =>
  sectionAction({ action: 'restore', eventId, sectionId });

// ── Adding sections (couple) ─────────────────────────────────────────────────

export type AddableSection = { templateSectionId: string; title: string; icon: string | null };

/** Common sections staff flagged that the couple can add (Bouquet Toss, etc.),
    from the event's template, minus ones already on the event. */
export async function getAddableSections(eventId: string): Promise<AddableSection[]> {
  const base = apiBase();
  if (!base) return [];
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return [];
  try {
    const res = await fetch(`${base}/api/mobile/planning/addable-sections?eventId=${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { sections?: AddableSection[] };
    return json.sections ?? [];
  } catch {
    return [];
  }
}

export type NewSong = {
  title: string;
  artist?: string | null;
  album?: string | null;
  artwork_url?: string | null;
  preview_url?: string | null;
  external_url?: string | null;
  provider?: 'spotify' | 'apple' | 'youtube' | 'manual';
  provider_id?: string | null;
};

/** Add a common section from the template into a group. */
export const addSectionFromTemplate = (eventId: string, groupId: string, templateSectionId: string): Promise<boolean> =>
  sectionAction({ action: 'add', eventId, groupId, templateSectionId });

/** Add a fully custom section (name + notes + up to 3 songs) into a group. */
export const addCustomSection = (
  eventId: string,
  groupId: string,
  custom: { title: string; notes?: string; songs?: NewSong[] },
): Promise<boolean> => sectionAction({ action: 'add', eventId, groupId, custom });

export async function loadSection(eventId: string, sectionId: string): Promise<{ questions: QuestionRow[]; songs: SongRow[] }> {
  const [{ data: questions }, { data: answers }, { data: songs }] = await Promise.all([
    supabase.from('planning_questions').select('*').eq('section_id', sectionId).order('sort_order'),
    supabase.from('planning_question_answers').select('question_id, answer').eq('event_id', eventId),
    supabase.from('planning_songs').select('*').eq('section_id', sectionId).order('sort_order'),
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
    songs: (songs ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist ?? null,
      artwork_url: s.artwork_url ?? null,
      preview_url: s.preview_url ?? null,
      must_play: !!s.must_play,
      do_not_play: !!s.do_not_play,
      note: s.note ?? null,
    })),
  };
}

/** Toggle "must play" (clears "do not play" when on). */
export async function setMustPlay(songId: string, value: boolean): Promise<void> {
  await supabase.from('planning_songs').update(value ? { must_play: true, do_not_play: false } : { must_play: false }).eq('id', songId);
}

/** Toggle "do not play" (clears "must play" when on). */
export async function setDoNotPlay(songId: string, value: boolean): Promise<void> {
  await supabase.from('planning_songs').update(value ? { do_not_play: true, must_play: false } : { do_not_play: false }).eq('id', songId);
}

/** Save (or clear) a dedication / instruction note on a song. */
export async function updateSongNote(songId: string, note: string): Promise<void> {
  await supabase.from('planning_songs').update({ note: note.trim() || null }).eq('id', songId);
}

/** Remove a song from a section. */
export async function removeSong(songId: string): Promise<void> {
  await supabase.from('planning_songs').delete().eq('id', songId);
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
    .select('*')
    .single();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    artist: data.artist ?? null,
    artwork_url: data.artwork_url ?? null,
    preview_url: data.preview_url ?? null,
    must_play: !!data.must_play,
    do_not_play: !!data.do_not_play,
    note: data.note ?? null,
  };
}

export function questionVisible(q: QuestionRow, answers: Record<string, string>): boolean {
  if (!q.condition_question_id) return true;
  const ctrl = answers[q.condition_question_id];
  if (ctrl == null) return true;
  if (q.condition_values.length === 0) return ctrl.trim() !== '';
  const parts = ctrl.split('|');
  return q.condition_values.some((v) => parts.includes(v) || ctrl === v);
}
