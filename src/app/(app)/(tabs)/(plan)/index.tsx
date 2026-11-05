import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OnboardingTour } from '@/components/OnboardingTour';
import { EventSwitcher } from '@/components/EventSwitcher';
import { HomeBody } from '@/components/plan/HomeBody';
import { chapterStatus, greeting, heroDateLabel } from '@/components/plan/model';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { blendedProgress, loadOverview, setupMilestones, type Group, type Overview, type SectionRow } from '@/lib/planning';
import { supabase } from '@/lib/supabase';

const TOUR_KEY = 'onboarding_seen_v1';

export default function HomeScreen() {
  const c = useC();
  const router = useRouter();
  const { profile } = useAuth();
  const { event, events, loading: eventLoading } = useEvent();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [venue, setVenue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const tourChecked = useRef(false);

  useEffect(() => {
    if (tourChecked.current || !profile) return;
    tourChecked.current = true;
    AsyncStorage.getItem(TOUR_KEY).then((v) => { if (!v) setShowTour(true); }).catch(() => {});
  }, [profile]);
  const closeTour = useCallback(() => {
    setShowTour(false);
    AsyncStorage.setItem(TOUR_KEY, '1').catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setOverview(event ? await loadOverview(event.id) : null);
    setLoading(false);
  }, [event]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!event?.venue_id) { setVenue(null); return; }
    supabase.from('venues').select('name').eq('id', event.venue_id).maybeSingle().then(({ data }) => {
      if (!cancelled) setVenue((data as { name?: string } | null)?.name ?? null);
    });
    return () => { cancelled = true; };
  }, [event?.venue_id]);

  if (loading || eventLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.accent} /></View>;
  }

  const isStaff = profile?.accountType === 'staff';
  const canSwitch = isStaff || events.length > 1;
  const milestones = event ? setupMilestones(event) : [];
  const pct = event ? blendedProgress(milestones, overview?.answeredQuestions ?? 0, overview?.totalQuestions ?? 0) : 0;

  const next = nextMoment(overview);
  const resume = next
    ? {
        icon: next.section.icon,
        title: next.section.title,
        meta: resumeMeta(next.section, next.group.title),
      }
    : overview && overview.sections[0]
      ? {
          icon: overview.sections[0].icon,
          title: overview.sections[0].title,
          meta: overview.groups.find((g) => g.sections.some((s) => s.id === overview.sections[0].id))?.title ?? 'Your plan',
        }
      : null;

  const openSection = (section: SectionRow, from: string) => {
    if (!event) return;
    router.push({ pathname: '/section/[id]', params: { id: section.id, eventId: event.id, from } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      {!event ? (
        <HomeBody
          greeting={greeting(profile?.firstName)}
          eventName="Your event"
          progress={0}
          canSwitch={false}
          onSwitch={() => {}}
          resume={null}
          onContinue={() => {}}
          chapters={[]}
          onChapter={() => {}}
          onSeeAll={() => {}}
          emptyMessage="No event is linked to your account yet. Your DJ will set this up shortly."
        />
      ) : (
        <HomeBody
          greeting={greeting(profile?.firstName)}
          eventName={event.name || 'Your Event'}
          coverUrl={event.cover_photo_url}
          date={event.event_date}
          dateLabel={event.event_date ? heroDateLabel(event.event_date) : undefined}
          venue={venue}
          progress={pct}
          canSwitch={canSwitch}
          onSwitch={() => { if (isStaff) router.push('/events'); else setSwitcher(true); }}
          resume={resume}
          onContinue={() => {
            if (!next && overview?.sections[0]) {
              const g = overview.groups.find((x) => x.sections.some((s) => s.id === overview.sections[0].id));
              openSection(overview.sections[0], g?.title ?? 'Home');
              return;
            }
            if (next) openSection(next.section, next.group.title);
          }}
          chapters={(overview?.groups ?? []).map((g, i) => {
            const status = chapterStatus(g);
            return {
              id: g.id,
              index: i + 1,
              title: g.title,
              moments: g.sections.length,
              status: status?.label ?? null,
              done: status?.done ?? false,
            };
          })}
          onChapter={(id) => {
            const g = overview?.groups.find((x) => x.id === id);
            router.push({ pathname: '/group/[id]', params: { id, eventId: event.id, title: g?.title ?? '' } });
          }}
          onSeeAll={() => router.navigate('/timeline')}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      <OnboardingTour visible={showTour} onClose={closeTour} />
      {events.length > 1 ? <EventSwitcher visible={switcher} onClose={() => setSwitcher(false)} /> : null}
    </View>
  );
}

function nextMoment(overview: Overview | null): { section: SectionRow; group: Group } | null {
  if (!overview) return null;
  for (const group of overview.groups) {
    const section = group.sections.find((s) => s.questionCount > 0 && s.answeredCount < s.questionCount);
    if (section) return { section, group };
  }
  return null;
}

function resumeMeta(section: SectionRow, chapter: string): string {
  const left = Math.max(0, section.questionCount - section.answeredCount);
  const q = left === 1 ? '1 question left' : `${left} questions left`;
  return section.time_label ? `${q} · ${chapter}, ${section.time_label}` : `${q} · ${chapter}`;
}
