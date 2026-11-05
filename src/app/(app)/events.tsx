import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { StaffEventsView } from '@/components/StaffEventsView';
import {
  groupStaffRows,
  initials,
  sortStaffItems,
  staffMatches,
  type PlanProgress,
  type StaffListItem,
} from '@/components/eventDisplay';
import { useAuth, staffSeesAllEvents } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useEvent } from '@/lib/events';
import { blendedProgress, getStaffEvents, setupMilestones, type StaffEvent } from '@/lib/planning';
import { supabase } from '@/lib/supabase';

export default function StaffEventsScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { profile } = useAuth();
  const { selectEvent } = useEvent();
  const [upcoming, setUpcoming] = useState<StaffEvent[] | null>(null);
  const [past, setPast] = useState<StaffEvent[] | null>(null);
  const [venues, setVenues] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState<Map<string, PlanProgress>>(new Map());
  const [company, setCompany] = useState('Xpress Entertainment');
  const [staffName, setStaffName] = useState('');
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming');

  const load = useCallback(async () => {
    if (!profile) return;
    const seesAll = staffSeesAllEvents(profile);
    const args = { employeeId: profile.employeeId, seesAll };
    const [nextEvents, pastEvents] = await Promise.all([
      getStaffEvents({ ...args, when: 'upcoming' }),
      getStaffEvents({ ...args, when: 'past' }),
    ]);
    setUpcoming(nextEvents);
    setPast(pastEvents);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('company_public').select('company_name').maybeSingle();
        const name = (data as { company_name?: string | null } | null)?.company_name?.trim();
        if (!cancelled && name) setCompany(name);
      } catch {
        /* eyebrow falls back to Xpress Entertainment */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setStaffName(profile.firstName || '');
    if (!profile.employeeId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('id', profile.employeeId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        if (name) setStaffName(name);
      } catch {
        /* first name from the profile is enough */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    const all = [...(upcoming ?? []), ...(past ?? [])];
    if (!all.length) return;
    let cancelled = false;
    (async () => {
      const [venueMap, progressMap] = await Promise.all([
        loadVenueNames(all.map((event) => event.venue_id).filter((id): id is string => !!id)),
        loadProgress(all),
      ]);
      if (!cancelled) {
        setVenues(venueMap);
        setProgress(progressMap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [upcoming, past]);

  const seesAll = staffSeesAllEvents(profile);
  const source = segment === 'upcoming' ? upcoming : past;
  const items = useMemo(() => {
    const list = (source ?? []).map((event) => toItem(event, venues, progress, t('staff.untitled')));
    const filtered = list.filter((item) => staffMatches(item, query, locale));
    return sortStaffItems(filtered, segment);
  }, [source, venues, progress, query, segment, locale, t]);
  const groups = useMemo(() => groupStaffRows(items, locale), [items, locale]);

  const open = useCallback(
    (id: string) => {
      const event = [...(upcoming ?? []), ...(past ?? [])].find((row) => row.id === id);
      if (!event) return;
      selectEvent({
        id: event.id,
        name: event.name,
        event_date: event.event_date,
        cover_photo_url: event.cover_photo_url,
        venue_id: event.venue_id,
        package_id: event.package_id,
      });
      router.push('/(tabs)/(plan)');
    },
    [upcoming, past, selectEvent, router],
  );

  const loading = !upcoming || !past;
  const segmentEmpty = !loading && (source?.length ?? 0) === 0;
  const noMatches = !loading && !segmentEmpty && items.length === 0;
  const emptyTitle = noMatches
    ? t('staff.noMatch', { query: query.trim() })
    : segment === 'past'
      ? t('staff.noPast')
      : seesAll
        ? t('staff.noUpcoming')
        : t('staff.noAssigned');
  const emptyBody = noMatches
    ? t('staff.tryAnother')
    : segment === 'past'
      ? t('staff.pastBody')
      : t('staff.upcomingBody');

  return (
    <StaffEventsView
      loading={loading}
      eyebrow={company ? t('staff.eyebrow', { company }) : t('common.staff')}
      initials={initials(staffName || t('common.staff'))}
      query={query}
      onQuery={setQuery}
      segment={segment}
      onSegment={setSegment}
      upcomingCount={upcoming?.length ?? 0}
      groups={groups}
      empty={segmentEmpty ? 'events' : noMatches ? 'matches' : null}
      emptyTitle={emptyTitle}
      emptyBody={emptyBody}
      onOpen={open}
    />
  );
}

function toItem(event: StaffEvent, venues: Map<string, string>, progress: Map<string, PlanProgress>, untitled: string): StaffListItem {
  return {
    id: event.id,
    eventDate: event.event_date,
    startTime: event.start_time,
    title: event.name?.trim() || event.clientName || untitled,
    staffLine: event.staffLine,
    venueName: event.venue_id ? venues.get(event.venue_id) ?? null : null,
    statusName: event.status?.name ?? null,
    statusColor: event.status?.color ?? null,
    statusTextColor: event.status?.textColor ?? null,
    progress: progress.get(event.id) ?? null,
    haystack: [event.name, event.clientName, event.staffLine, event.status?.name, event.event_date].filter(Boolean).join(' '),
  };
}

async function loadVenueNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 80) {
    const part = unique.slice(i, i + 80);
    try {
      const first = await supabase.from('venues').select('id, name').in('id', part);
      if (!first.error && first.data) {
        for (const row of first.data as { id: string; name: string | null }[]) {
          if (row.name?.trim()) map.set(row.id, row.name.trim());
        }
        continue;
      }
      const second = await supabase.from('venues').select('id, venue_name').in('id', part);
      if (!second.error && second.data) {
        for (const row of second.data as { id: string; venue_name: string | null }[]) {
          if (row.venue_name?.trim()) map.set(row.id, row.venue_name.trim());
        }
      }
    } catch {
      /* venue names are optional on the row */
    }
  }
  return map;
}

async function loadProgress(events: StaffEvent[]): Promise<Map<string, PlanProgress>> {
  const map = new Map<string, PlanProgress>();
  const ids = events.map((event) => event.id);
  const questions: { id: string; event_id: string }[] = [];
  const answers: { question_id: string; answer: string | null }[] = [];
  try {
    for (let i = 0; i < ids.length; i += 40) {
      const part = ids.slice(i, i + 40);
      const [questionRes, answerRes] = await Promise.all([
        supabase.from('planning_questions').select('id, event_id').in('event_id', part).limit(5000),
        supabase.from('planning_question_answers').select('question_id, answer').in('event_id', part).limit(5000),
      ]);
      if (questionRes.error || answerRes.error) return map;
      questions.push(...((questionRes.data ?? []) as { id: string; event_id: string }[]));
      answers.push(...((answerRes.data ?? []) as { question_id: string; answer: string | null }[]));
    }
  } catch {
    return map;
  }
  const answered = new Set(answers.filter((answer) => (answer.answer ?? '').trim() !== '').map((answer) => answer.question_id));
  const totals = new Map<string, { total: number; answered: number }>();
  for (const question of questions) {
    const bucket = totals.get(question.event_id) ?? { total: 0, answered: 0 };
    bucket.total += 1;
    if (answered.has(question.id)) bucket.answered += 1;
    totals.set(question.event_id, bucket);
  }
  for (const event of events) {
    const bucket = totals.get(event.id) ?? { total: 0, answered: 0 };
    map.set(event.id, {
      pct: blendedProgress(setupMilestones(event), bucket.answered, bucket.total),
      answered: bucket.answered,
      total: bucket.total,
    });
  }
  return map;
}
