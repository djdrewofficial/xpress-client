import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SafetyLinks } from '@/components/moderation/SafetyLinks';
import { useModeration } from '@/components/moderation/useModeration';
import { OnboardingTour } from '@/components/OnboardingTour';
import { EventSwitcher } from '@/components/EventSwitcher';
import { HomeBody } from '@/components/plan/HomeBody';
import { chapterStatus, greeting, heroDateLabel } from '@/components/plan/model';
import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { blendedProgress, loadOverview, setupMilestones, type Group, type Overview, type SectionRow } from '@/lib/planning';
import { managesEvent } from '@/lib/membership';
import { loadEventContent } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';

const TOUR_KEY = 'onboarding_seen_v1';

export default function HomeScreen() {
  const c = useC();
  const { t, locale } = useT();
  const router = useRouter();
  const { profile, session } = useAuth();
  const { event, events, loading: eventLoading } = useEvent();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [venue, setVenue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [coverFromFeed, setCoverFromFeed] = useState<string | null | undefined>(undefined);
  const [coverAuthor, setCoverAuthor] = useState<{ userId: string; label: string | null } | null>(null);
  const [coverTick, setCoverTick] = useState(0);
  const tourChecked = useRef(false);
  const moderation = useModeration(event?.id ?? null, () => setCoverTick((n) => n + 1));

  // Couples finish Welcome in OnboardingGate, which marks this seen.
  // If the flag is still empty (staff opening an event, or an interrupted
  // first run), show the music + first-song steps once. Welcome/legal is not here.
  useEffect(() => {
    if (tourChecked.current || !profile) return;
    tourChecked.current = true;
    AsyncStorage.getItem(TOUR_KEY).then((v) => { if (!v) setShowTour(true); }).catch(() => {});
  }, [profile]);
  const closeTour = useCallback(() => {
    setShowTour(false);
    AsyncStorage.setItem(TOUR_KEY, '1').catch(() => {});
  }, []);

  useEffect(() => {
    if (!event?.id) {
      setCoverFromFeed(undefined);
      return;
    }
    let cancel = false;
    void loadEventContent(event.id).then((res) => {
      if (cancel) return;
      if (!res.ok) {
        setCoverFromFeed(undefined);
        setCoverAuthor(null);
        return;
      }
      const cover = res.data.coverPhoto;
      setCoverFromFeed(cover?.hidden ? null : cover?.url ?? null);
      setCoverAuthor(cover && !cover.hidden && cover.updatedBy
        ? { userId: cover.updatedBy, label: cover.updatedByLabel }
        : null);
    });
    return () => { cancel = true; };
  }, [event?.id, coverTick]);

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
        meta: resumeMeta(next.section, next.group.title, questionLabel(next.section, t)),
      }
    : overview && overview.sections[0]
      ? {
          icon: overview.sections[0].icon,
          title: overview.sections[0].title,
          meta: overview.groups.find((g) => g.sections.some((s) => s.id === overview.sections[0].id))?.title ?? t('home.yourPlan'),
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
          greeting={greeting(profile?.firstName, locale)}
          eventName={t('home.yourEvent')}
          progress={0}
          canSwitch={false}
          onSwitch={() => {}}
          resume={null}
          onContinue={() => {}}
          chapters={[]}
          onChapter={() => {}}
          onSeeAll={() => {}}
          emptyMessage={t('home.noEvent')}
        />
      ) : (
        <HomeBody
          greeting={greeting(profile?.firstName, locale)}
          eventName={event.name || t('home.yourEventTitle')}
          coverUrl={coverFromFeed === undefined ? event.cover_photo_url : coverFromFeed}
          coverActions={(coverFromFeed === undefined ? event.cover_photo_url : coverFromFeed) ? (
            <SafetyLinks
              tone="onDark"
              reportLabel={t('safety.reportCover')}
              onReport={() => moderation.openReport({ targetType: 'cover_photo', targetId: event.id })}
              hideLabel={t('safety.remove')}
              onHide={() => moderation.askHide({ targetType: 'cover_photo', targetId: event.id })}
              blockLabel={coverAuthor && coverAuthor.userId !== session?.user.id
                ? (coverAuthor.label ? t('safety.blockNamed', { name: coverAuthor.label }) : t('safety.block'))
                : undefined}
              onBlock={coverAuthor && coverAuthor.userId !== session?.user.id
                ? () => moderation.askBlock(coverAuthor.userId, coverAuthor.label)
                : undefined}
              guestLabel={managesEvent(event, profile?.accountType) && coverAuthor && coverAuthor.userId !== session?.user.id
                ? (coverAuthor.label ? t('safety.removeGuestNamed', { name: coverAuthor.label }) : t('safety.removeGuest'))
                : undefined}
              onRemoveGuest={managesEvent(event, profile?.accountType) && coverAuthor && coverAuthor.userId !== session?.user.id
                ? () => moderation.askRemoveGuest(coverAuthor.userId, coverAuthor.label)
                : undefined}
            />
          ) : null}
          date={event.event_date}
          dateLabel={event.event_date ? heroDateLabel(event.event_date, locale) : undefined}
          venue={venue}
          progress={pct}
          canSwitch={canSwitch}
          onSwitch={() => { if (isStaff) router.push('/events'); else setSwitcher(true); }}
          resume={resume}
          onContinue={() => {
            if (!next && overview?.sections[0]) {
              const g = overview.groups.find((x) => x.sections.some((s) => s.id === overview.sections[0].id));
              openSection(overview.sections[0], g?.title ?? t('tab.home'));
              return;
            }
            if (next) openSection(next.section, next.group.title);
          }}
          chapters={(overview?.groups ?? []).map((g, i) => {
            const status = chapterStatus(g, locale);
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
      {moderation.sheet}
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

function questionLabel(section: SectionRow, t: (key: 'home.questionLeft' | 'home.questionsLeft', vars?: { count: number }) => string): string {
  const left = Math.max(0, section.questionCount - section.answeredCount);
  return left === 1 ? t('home.questionLeft') : t('home.questionsLeft', { count: left });
}

function resumeMeta(section: SectionRow, chapter: string, label: string): string {
  return section.time_label ? `${label} · ${chapter}, ${section.time_label}` : `${label} · ${chapter}`;
}
