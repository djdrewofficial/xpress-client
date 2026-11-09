import { coupleDisplayName } from '@/lib/coupleName';
import { blendedProgress, loadOverview, setupMilestones } from '@/lib/planning';
import { supabase } from '@/lib/supabase';

export type WelcomeSnapshot = {
  names: string;
  date: string | null;
  venue: string | null;
  /** 0–100, or null when planning data didn't load. */
  progress: number | null;
  /** Existing public cover URL, when the event already has one. */
  coverUrl?: string | null;
};

type LinkedClient = { first_name?: string | null } | { first_name?: string | null }[] | null;

function firstOf(client: LinkedClient): string | null {
  if (!client) return null;
  const row = Array.isArray(client) ? client[0] : client;
  return row?.first_name ?? null;
}

/** Couple label, event date, venue name, and endowed planning progress for Welcome. */
export async function loadWelcomeSnapshot(eventId: string): Promise<WelcomeSnapshot> {
  const empty: WelcomeSnapshot = { names: '', date: null, venue: null, progress: null, coverUrl: null };
  const { data: ev } = await supabase
    .from('events')
    .select('name, event_date, venue_id, package_id, client_id, cover_photo_url')
    .eq('id', eventId)
    .maybeSingle();
  if (!ev) return empty;

  const firstNames: string[] = [];
  if (ev.client_id) {
    const { data: primary } = await supabase.from('clients').select('first_name').eq('id', ev.client_id).maybeSingle();
    if (primary?.first_name) firstNames.push(primary.first_name);
  }
  const { data: linked } = await supabase
    .from('event_clients')
    .select('client:clients(first_name)')
    .eq('event_id', eventId);
  for (const row of linked ?? []) {
    const first = firstOf((row as { client?: LinkedClient }).client ?? null);
    if (first) firstNames.push(first);
  }

  let venue: string | null = null;
  if (ev.venue_id) {
    const { data: v, error } = await supabase.from('venues').select('name').eq('id', ev.venue_id).maybeSingle();
    if (!error && v && typeof (v as { name?: unknown }).name === 'string') venue = (v as { name: string }).name;
  }

  let progress: number | null = null;
  try {
    const ov = await loadOverview(eventId);
    const milestones = setupMilestones({
      event_date: ev.event_date,
      venue_id: ev.venue_id,
      package_id: ev.package_id,
    });
    progress = blendedProgress(milestones, ov.answeredQuestions, ov.totalQuestions);
  } catch {
    progress = null;
  }

  const cover = (ev as { cover_photo_url?: unknown }).cover_photo_url;
  return {
    names: coupleDisplayName(firstNames, ev.name),
    date: ev.event_date ?? null,
    venue,
    progress,
    coverUrl: typeof cover === 'string' && cover.trim() ? cover : null,
  };
}
