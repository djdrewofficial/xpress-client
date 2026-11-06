import { apiBase, authorizedFetch } from '@/lib/api';
import { fetchEventCard } from '@/lib/eventCard';
import { restrictGuestOverview } from '@/lib/guestSections';
import { rememberMembership, roleForEvent } from '@/lib/membership';
import { supabase } from '@/lib/supabase';

export type EventLite = {
  id: string;
  name: string;
  event_date: string | null;
  cover_photo_url: string | null;
  /** Per-event role. One login can be a host of one event and a guest of another. */
  role?: 'host' | 'guest' | 'staff' | null;
  venueName?: string | null;
  // Booking essentials the DJ already set — drive the endowed-progress seed below.
  venue_id?: string | null;
  package_id?: string | null;
};

export type SetupMilestone = { key: 'account' | 'date' | 'package' | 'venue'; label: string; short: string; done: boolean };

/** Booking steps that are genuinely already done for a couple (the DJ set the date,
    booked a package, picked a venue; the account exists). Honest, event-derived — no
    faked progress. Powers the goal-gradient seed so a new plan never opens at 0%. */
export function setupMilestones(event: Pick<EventLite, 'event_date' | 'venue_id' | 'package_id'>): SetupMilestone[] {
  return [
    { key: 'account', label: 'Account created', short: 'signed up', done: true },
    { key: 'date', label: 'Date set', short: 'date set', done: !!event.event_date },
    { key: 'package', label: 'Package booked', short: 'booked', done: !!event.package_id },
    { key: 'venue', label: 'Venue set', short: 'venue set', done: !!event.venue_id },
  ];
}

/** Share of the progress bar reserved for booking milestones already completed.
    The rest tracks planning answers, so the seed reflects real work, never inflates. */
export const SETUP_WEIGHT = 0.2;

/** Blend the honest setup seed with answered questions into a 0–100 display percent.
    Fully-booked couple, zero answers → SETUP_WEIGHT (20%); grows to 100% as they answer. */
export function blendedProgress(milestones: SetupMilestone[], answeredQuestions: number, totalQuestions: number): number {
  const setupPct = milestones.length ? milestones.filter((m) => m.done).length / milestones.length : 0;
  const questionPct = totalQuestions > 0 ? answeredQuestions / totalQuestions : 0;
  return Math.round((SETUP_WEIGHT * setupPct + (1 - SETUP_WEIGHT) * questionPct) * 100);
}

export type SectionRow = {
  id: string;
  title: string;
  icon: string | null;
  section_type: 'info' | 'timeline' | 'headline';
  module: string | null;
  songs_enabled: boolean;
  questions_enabled: boolean;
  song_limit: number | null;
  sort_order: number;
  on_timeline: boolean | null; // per-event override; null = auto (on when section_type==='timeline')
  on_music: boolean | null; // per-event override; null = auto (vibe playlists: songs on + no single-song limit)
  time_enabled: boolean; // section supports a time
  time_label: string | null; // the time shown on the timeline, e.g. "5:00 PM"
  /** Hosts turn this on so guests can see and fill out the section. */
  guest_enabled?: boolean;
  locked: boolean;
  questionCount: number;
  answeredCount: number;
  songCount: number;
  /** A song on this moment already has a note. */
  hasNotes: boolean;
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
  intro: string | null;
  totalQuestions: number;
  answeredQuestions: number;
  songCount: number;
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
  /** When the answer row was last written. Absent until the couple answers. */
  updated_at?: string | null;
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
  /** Auth user who added the song. Guests can change only their own rows. */
  requested_by?: string | null;
  provider?: string | null;
  provider_id?: string | null;
};

export type EventSong = SongRow & { section_id: string };

function toSongRow(s: {
  id: string;
  title: string;
  artist?: string | null;
  artwork_url?: string | null;
  preview_url?: string | null;
  must_play?: boolean | null;
  do_not_play?: boolean | null;
  note?: string | null;
  provider?: string | null;
  provider_id?: string | null;
  requested_by?: string | null;
}): SongRow {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist ?? null,
    artwork_url: s.artwork_url ?? null,
    preview_url: s.preview_url ?? null,
    must_play: !!s.must_play,
    do_not_play: !!s.do_not_play,
    note: s.note ?? null,
    provider: s.provider ?? null,
    provider_id: s.provider_id ?? null,
    requested_by: s.requested_by ?? null,
  };
}

/** Events this login can open. Host events come from the client link. Guest events
    come from event_app_members plus the safe event card, because guests cannot read `events`. */
export async function getMyEvents(account: { clientId: string | null; eventGuestId: string | null }): Promise<EventLite[]> {
  const out: EventLite[] = [];
  const seen = new Set<string>();
  const add = (event: EventLite, role: 'host' | 'guest') => {
    const existing = out.find((row) => row.id === event.id);
    if (existing) {
      if (role === 'host') existing.role = 'host';
      return;
    }
    seen.add(event.id);
    out.push({ ...event, role });
  };

  if (account.clientId) {
    const [{ data: primary }, { data: linked }] = await Promise.all([
      supabase.from('events').select('id, name, event_date, cover_photo_url, venue_id, package_id').eq('client_id', account.clientId).is('archived_at', null),
      supabase.from('event_clients').select('event:events(id, name, event_date, cover_photo_url, venue_id, package_id, archived_at)').eq('client_id', account.clientId),
    ]);
    for (const event of primary ?? []) add(event as EventLite, 'host');
    for (const row of linked ?? []) {
      const event = (row as unknown as { event: (EventLite & { archived_at: string | null }) | null }).event;
      if (event && !event.archived_at) add(event, 'host');
    }
  }
  if (account.eventGuestId) {
    const { data: guest } = await supabase
      .from('event_guests')
      .select('event:events(id, name, event_date, cover_photo_url, venue_id, package_id)')
      .eq('id', account.eventGuestId)
      .maybeSingle();
    const event = (guest as unknown as { event: EventLite | null } | null)?.event;
    if (event) add(event, 'guest');
  }

  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (uid) {
    const { data: members, error } = await supabase
      .from('event_app_members')
      .select('event_id, role')
      .eq('auth_user_id', uid);
    if (!error) {
      for (const member of members ?? []) {
        const role = member.role === 'guest' ? 'guest' : 'host';
        await rememberMembership(uid, member.event_id, role);
        if (seen.has(member.event_id)) {
          if (role === 'host') {
            const existing = out.find((row) => row.id === member.event_id);
            if (existing) existing.role = 'host';
          }
          continue;
        }
        const card = await fetchEventCard(member.event_id);
        const event: EventLite = card
          ? {
              id: card.id,
              name: card.name,
              event_date: card.eventDate,
              cover_photo_url: card.coverPhotoUrl,
              venueName: card.venueName,
              role: card.role === 'staff' ? 'host' : card.role,
            }
          : { id: member.event_id, name: '', event_date: null, cover_photo_url: null, role };
        add(event, role);
      }
    }
    for (const event of out) {
      if (event.role === 'host' || event.role === 'guest') await rememberMembership(uid, event.id, event.role);
    }
  }

  return out.sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? ''));
}

export type StaffEvent = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  cover_photo_url: string | null;
  venue_id: string | null;
  package_id: string | null;
  clientName: string | null;
  /** Assigned people, e.g. "DJ Drew · MC Alex". Null when the roster isn't available. */
  staffLine: string | null;
  status: { name: string; color: string | null; textColor: string | null } | null;
};

type StaffEventRow = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  cover_photo_url: string | null;
  venue_id: string | null;
  package_id: string | null;
  client: { first_name: string | null; last_name: string | null } | null;
  status: { name: string; color: string | null; text_color: string | null } | null;
};

/** Events a staff member can open. Admins/sales see all; plain employees see only
    events they're assigned to (event_staff). `upcoming` includes undated events.
    No financials/contracts here. */
export async function getStaffEvents(opts: {
  employeeId: string | null;
  seesAll: boolean;
  when?: 'upcoming' | 'past';
}): Promise<StaffEvent[]> {
  const cols =
    'id, name, event_date, start_time, cover_photo_url, venue_id, package_id, client:clients(first_name, last_name), status:event_statuses(name, color, text_color)';
  const today = new Date().toISOString().slice(0, 10);
  const when = opts.when ?? 'upcoming';
  const select = opts.seesAll ? cols : `${cols}, event_staff!inner(employee_id)`;

  const run = (mode: 'upcoming' | 'past' | 'dated') => {
    let query = supabase.from('events').select(select).is('archived_at', null);
    if (!opts.seesAll) query = query.eq('event_staff.employee_id', opts.employeeId ?? '');
    if (mode === 'past') query = query.lt('event_date', today).order('event_date', { ascending: false });
    else if (mode === 'dated') query = query.gte('event_date', today).order('event_date', { ascending: true });
    else query = query.or(`event_date.gte.${today},event_date.is.null`).order('event_date', { ascending: true });
    return query;
  };

  const first = await run(when);
  // If the upcoming OR-filter is rejected, dated events still load.
  const result = first.error && when === 'upcoming' ? await run('dated') : first;
  const rows = (result.data ?? []) as unknown as StaffEventRow[];
  const seen = new Set<string>();
  const out: StaffEvent[] = [];
  for (const r of rows) {
    if (!r?.id || seen.has(r.id)) continue; // event_staff!inner can duplicate an event across roles
    seen.add(r.id);
    out.push({
      id: r.id,
      name: r.name,
      event_date: r.event_date,
      start_time: r.start_time,
      cover_photo_url: r.cover_photo_url,
      venue_id: r.venue_id,
      package_id: r.package_id,
      clientName: r.client ? [r.client.first_name, r.client.last_name].filter(Boolean).join(' ') || null : null,
      staffLine: null,
      status: r.status ? { name: r.status.name, color: r.status.color, textColor: r.status.text_color } : null,
    });
  }
  const staff = await loadEventStaff(out.map((event) => event.id));
  for (const event of out) event.staffLine = staff.get(event.id) ?? null;
  return out;
}

/** Names and roles from event_staff. Empty map if that read isn't allowed. */
async function loadEventStaff(eventIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, { role: string | null; name: string }[]>();
  if (!eventIds.length) return new Map();
  try {
    for (let i = 0; i < eventIds.length; i += 80) {
      const part = eventIds.slice(i, i + 80);
      const { data, error } = await supabase
        .from('event_staff')
        .select('event_id, role, employee:employees(first_name, last_name)')
        .in('event_id', part);
      if (error || !data) continue;
      for (const row of data as unknown as {
        event_id: string;
        role: string | null;
        employee: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
      }[]) {
        const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
        const name = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ').trim();
        const role = row.role?.trim() || null;
        if (!name && !role) continue;
        const list = map.get(row.event_id) ?? [];
        list.push({ role, name });
        map.set(row.event_id, list);
      }
    }
  } catch {
    return new Map();
  }
  const lines = new Map<string, string>();
  for (const [eventId, people] of map) {
    const line = formatStaffLine(people);
    if (line) lines.set(eventId, line);
  }
  return lines;
}

function formatStaffLine(people: { role: string | null; name: string }[]): string | null {
  const rank = (role: string | null) => {
    const key = (role ?? '').toLowerCase();
    if (key === 'dj') return 0;
    if (key === 'mc') return 1;
    return 2;
  };
  const parts = [...people]
    .sort((a, b) => rank(a.role) - rank(b.role) || (a.role ?? '').localeCompare(b.role ?? ''))
    .map((person) => (person.role && person.name ? `${person.role} ${person.name}` : person.name || person.role || ''))
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Section list + progress for the home screen. */
export async function loadOverview(eventId: string): Promise<Overview> {
  const [{ data: sections }, { data: questions }, { data: answers }, { data: songs }] = await Promise.all([
    supabase.from('planning_sections').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('planning_questions').select('id, section_id').eq('event_id', eventId),
    supabase.from('planning_question_answers').select('question_id, answer').eq('event_id', eventId),
    supabase.from('planning_songs').select('id, section_id, note').eq('event_id', eventId),
  ]);

  const answered = new Set((answers ?? []).filter((a) => (a.answer ?? '').trim() !== '').map((a) => a.question_id));
  const qBySection = new Map<string, string[]>();
  for (const q of questions ?? []) {
    const list = qBySection.get(q.section_id) ?? [];
    list.push(q.id);
    qBySection.set(q.section_id, list);
  }
  const songBySection = new Map<string, number>();
  const notesBySection = new Set<string>();
  for (const s of songs ?? []) {
    songBySection.set(s.section_id, (songBySection.get(s.section_id) ?? 0) + 1);
    if ((s.note ?? '').trim()) notesBySection.add(s.section_id);
  }

  let totalQuestions = 0;
  let answeredQuestions = 0;
  const flat: SectionRow[] = [];
  const removed: RemovedSection[] = [];
  const groups: Group[] = [];
  let current: Group | null = null;

  const ensureGroup = (): Group => {
    if (!current) {
      current = { id: 'start', title: 'Your plan', icon: '✨', intro: null, sections: [], totalQuestions: 0, answeredQuestions: 0, songCount: 0 };
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
      current = { id: s.id, title: s.title, icon: s.icon, intro: s.intro ?? null, sections: [], totalQuestions: 0, answeredQuestions: 0, songCount: 0 };
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
      hasNotes: notesBySection.has(s.id),
    };
    flat.push(row);
    totalQuestions += qs.length;
    answeredQuestions += ans;
    const g = ensureGroup();
    g.sections.push(row);
    g.totalQuestions += qs.length;
    g.answeredQuestions += ans;
    g.songCount += songCount;
  }

  const overview = { groups: groups.filter((g) => g.sections.length > 0), sections: flat, removed, totalQuestions, answeredQuestions };
  if (roleForEvent(eventId) === 'guest') return restrictGuestOverview(overview);
  return overview;
}

// ── Section management (staff + hosts) — writes go through an XOS admin route
//    because hosts can't write planning_sections under RLS. ────────────────────

async function sectionAction(body: Record<string, unknown>): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const res = await authorizedFetch(`${base}/api/mobile/planning/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  try {
    const res = await authorizedFetch(
      `${base}/api/mobile/planning/addable-sections?eventId=${encodeURIComponent(eventId)}`,
    );
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
  custom: { title: string; notes?: string; icon?: string | null; songs?: NewSong[] },
): Promise<boolean> => sectionAction({ action: 'add', eventId, groupId, custom });

export async function loadSection(eventId: string, sectionId: string): Promise<{ questions: QuestionRow[]; songs: SongRow[] }> {
  const [{ data: questions }, { data: answers }, { data: songs }] = await Promise.all([
    supabase.from('planning_questions').select('*').eq('section_id', sectionId).order('sort_order'),
    supabase.from('planning_question_answers').select('question_id, answer, updated_at').eq('event_id', eventId),
    supabase.from('planning_songs').select('*').eq('section_id', sectionId).order('sort_order'),
  ]);
  const ansMap = new Map((answers ?? []).map((a) => [a.question_id, a]));
  return {
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      help_text: q.help_text,
      answer_type: q.answer_type,
      options: Array.isArray(q.options) ? q.options : [],
      answer: ansMap.get(q.id)?.answer ?? null,
      condition_question_id: q.condition_question_id ?? null,
      condition_values: Array.isArray(q.condition_values) ? q.condition_values : [],
      updated_at: ansMap.get(q.id)?.updated_at ?? null,
    })),
    songs: (songs ?? []).map((s) => toSongRow(s)),
  };
}

/** Every song on the event, in playlist order. Powers the Music record. */
export async function loadEventSongs(eventId: string): Promise<EventSong[]> {
  const { data } = await supabase
    .from('planning_songs')
    .select('id, section_id, title, artist, artwork_url, preview_url, must_play, do_not_play, note, provider, provider_id, sort_order')
    .eq('event_id', eventId)
    .order('sort_order');
  const rows = (data ?? []).map((s) => ({ ...toSongRow(s), section_id: s.section_id }));
  if (roleForEvent(eventId) === 'guest') return rows.filter((song) => !song.do_not_play);
  return rows;
}

/** Toggle "must play" (clears "do not play" when on). Returns false if the write
    failed (e.g. RLS/network) so callers can roll back the optimistic UI. */
export async function setMustPlay(songId: string, value: boolean): Promise<boolean> {
  const { error } = await supabase.from('planning_songs').update(value ? { must_play: true, do_not_play: false } : { must_play: false }).eq('id', songId);
  return !error;
}

/** Toggle "do not play" (clears "must play" when on). Returns false on failure. */
export async function setDoNotPlay(songId: string, value: boolean): Promise<boolean> {
  const { error } = await supabase.from('planning_songs').update(value ? { do_not_play: true, must_play: false } : { do_not_play: false }).eq('id', songId);
  return !error;
}

/** Save (or clear) a dedication / instruction note on a song. Returns false on failure. */
export async function updateSongNote(songId: string, note: string): Promise<boolean> {
  const { error } = await supabase.from('planning_songs').update({ note: note.trim() || null }).eq('id', songId);
  return !error;
}

/** Remove a song from a section. Returns false on failure. */
export async function loadMyLikes(songIds: string[], userId: string): Promise<Set<string>> {
  if (!songIds.length || !userId) return new Set();
  const { data, error } = await supabase
    .from('planning_song_likes')
    .select('song_id')
    .eq('account_id', userId)
    .in('song_id', songIds);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.song_id as string));
}

/** Like or unlike a song. Returns false on failure, including a 403 on a closed section. */
export async function setSongLiked(songId: string, userId: string, liked: boolean): Promise<boolean> {
  if (!userId) return false;
  if (liked) {
    const { error } = await supabase.from('planning_song_likes').insert({ song_id: songId, account_id: userId });
    return !error;
  }
  const { error } = await supabase.from('planning_song_likes').delete().eq('song_id', songId).eq('account_id', userId);
  return !error;
}

export async function removeSong(songId: string): Promise<boolean> {
  const { error } = await supabase.from('planning_songs').delete().eq('id', songId);
  return !error;
}

/** Save a question answer. Returns false if the write failed so the caller can
    warn the user instead of silently losing it. */
export async function saveAnswer(eventId: string, questionId: string, answer: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('planning_question_answers')
    .upsert({ question_id: questionId, event_id: eventId, answer, answered_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'question_id' });
  return !error;
}

/** Add a song to a section from search or a playlist import. Returns the new row. */
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
  const { data: session } = await supabase.auth.getSession();
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
      // Guests can insert only when this is their user id. Hosts use the same value.
      requested_by: session.session?.user.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!data) return null;
  return toSongRow(data);
}

export function questionVisible(q: QuestionRow, answers: Record<string, string>): boolean {
  if (!q.condition_question_id) return true;
  const ctrl = answers[q.condition_question_id];
  if (ctrl == null) return true;
  if (q.condition_values.length === 0) return ctrl.trim() !== '';
  const parts = ctrl.split('|');
  return q.condition_values.some((v) => parts.includes(v) || ctrl === v);
}
