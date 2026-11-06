import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { reorderItems, type ReorderableListReorderEvent } from 'react-native-reorderable-list';

import { useC } from '@/components/ui';
import { AddSectionSheet } from '@/components/AddSectionSheet';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { TimelineBoard, type TimelineArchived, type TimelineChapter, type TimelineMoment } from '@/components/TimelineBoard';
import { Brand } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { formatEventEyebrow } from '@/lib/eventDate';
import { translate, useT, type Locale } from '@/lib/i18n';
import { pickAndUploadPlannerTimeline, type PlannerSource } from '@/lib/eventFiles';
import {
  deleteSection,
  loadOverview,
  onTimeline,
  reorderSections,
  restoreSection,
  setSectionTime,
  type SectionRow,
} from '@/lib/planning';

const tipKey = (uid: string) => `xpress.timeline.plusTip.${uid}`;

/** "SAT · JUNE 13, 2027" / "SAB · 13 JUN 2027". Null when the event has no date. */
export function formatTimelineDate(iso: string | null | undefined, locale: Locale = 'en'): string | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return formatEventEyebrow(day, locale);
}

function toMoment(s: SectionRow, locale: Locale): TimelineMoment {
  const badge = s.questionCount > 0
    ? s.answeredCount >= s.questionCount
      ? 'done'
      : `${s.answeredCount}/${s.questionCount}`
    : undefined;
  const meta = s.songs_enabled || s.songCount > 0
    ? s.songCount === 0
      ? translate(locale, 'timeline.noSongs')
      : s.songCount === 1
        ? translate(locale, 'timeline.oneSong')
        : translate(locale, 'timeline.nSongs', { count: s.songCount })
    : undefined;
  return {
    id: s.id,
    title: s.title,
    icon: s.icon,
    timeLabel: s.time_label,
    // Timeline moments are the schedule, so they offer a time. Templates leave
    // `time_enabled` off, which hid the control. Info rows pinned to the timeline
    // stay dot-only unless Time is on or a time is already saved.
    timeEnabled: s.time_enabled || s.section_type === 'timeline' || !!s.time_label,
    locked: s.locked,
    meta,
    badge,
  };
}

function momentOrdinal(chapters: TimelineChapter[], id: string, locale: Locale): string | null {
  let n = 0;
  for (const chapter of chapters) {
    for (const moment of chapter.moments) {
      n += 1;
      if (moment.id === id) return translate(locale, 'moment.eyebrowN', { n: String(n).padStart(2, '0') });
    }
  }
  return null;
}

export default function TimelineScreen() {
  const c = useC();
  const { t, locale } = useT();
  const router = useRouter();
  const { profile, session } = useAuth();
  const uid = session?.user.id ?? null;
  const { event, eventId, loading: eventLoading } = useEvent();
  const [chapters, setChapters] = useState<TimelineChapter[]>([]);
  const [addTargets, setAddTargets] = useState<{ id: string; title: string }[]>([]);
  const [archived, setArchived] = useState<TimelineArchived[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeEditing, setTimeEditing] = useState<TimelineMoment | null>(null);
  const [reordering, setReordering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [coach, setCoach] = useState(false);
  const [ptBusy, setPtBusy] = useState(false);
  const [addingGroup, setAddingGroup] = useState<{ id: string; title: string } | null>(null);

  const canManage = profile?.accountType === 'staff' || profile?.accountType === 'client';

  const load = useCallback(async () => {
    if (!eventId) {
      setChapters([]);
      setAddTargets([]);
      setArchived([]);
      setLoading(false);
      return;
    }
    const ov = await loadOverview(eventId);
    setChapters(
      ov.groups
        .map((grp) => ({
          id: grp.id,
          title: grp.title,
          moments: grp.sections.filter(onTimeline).map((section) => toMoment(section, locale)),
        }))
        .filter((grp) => grp.moments.length > 0),
    );
    setAddTargets(ov.groups.map((grp) => ({ id: grp.id, title: grp.title })));
    setArchived(ov.removed);
    setLoading(false);
  }, [eventId, locale]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // First visit, per signed-in user. Guests have no plus, so they never see it.
  useEffect(() => {
    if (!uid || !canManage) return;
    let cancelled = false;
    AsyncStorage.getItem(tipKey(uid))
      .then((v) => { if (!cancelled && !v) setCoach(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [uid, canManage]);

  const dismissCoach = useCallback(() => {
    setCoach(false);
    if (uid) AsyncStorage.setItem(tipKey(uid), '1').catch(() => {});
  }, [uid]);

  const saveTime = useCallback(async (moment: TimelineMoment, time: string | null) => {
    if (!eventId) return;
    setTimeEditing(null);
    setChapters((cs) => cs.map((chapter) => ({
      ...chapter,
      moments: chapter.moments.map((m) => (m.id === moment.id ? { ...m, timeLabel: time } : m)),
    })));
    if (!(await setSectionTime(eventId, moment.id, time))) {
      Alert.alert(t('moment.timeFail'), t('common.tryAgain'));
      load();
    }
  }, [eventId, load]);

  const runUpload = useCallback(async (src: PlannerSource) => {
    if (!eventId) return;
    setPtBusy(true);
    try {
      const res = await pickAndUploadPlannerTimeline(eventId, src);
      if (res) {
        await load();
        Alert.alert(t('timeline.uploaded'), t('timeline.uploadedBody', { name: res.name }));
      }
    } catch (e) {
      Alert.alert(t('timeline.uploadFail'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setPtBusy(false);
    }
  }, [eventId, load]);

  const uploadPlanner = useCallback(() => {
    Alert.alert(t('timeline.addWhere'), t('timeline.addWhereBody'), [
      { text: t('timeline.photoLibrary'), onPress: () => runUpload('gallery') },
      { text: t('timeline.files'), onPress: () => runUpload('files') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [runUpload]);

  const openMenu = useCallback(() => {
    if (coach) dismissCoach();
    setMenuOpen(true);
  }, [coach, dismissCoach]);

  const startUpload = useCallback(() => {
    setMenuOpen(false);
    // Let the sheet modal dismiss before the source alert, or iOS drops the alert.
    setTimeout(uploadPlanner, 350);
  }, [uploadPlanner]);

  const startNew = useCallback(() => {
    setMenuOpen(false);
    if (addTargets.length === 0) {
      Alert.alert(t('timeline.nothingYet'), t('timeline.nothingBody'));
      return;
    }
    if (addTargets.length === 1) {
      setAddingGroup(addTargets[0]);
      return;
    }
    setTimeout(() => {
      Alert.alert(t('timeline.whichPart'), t('timeline.whichBody'), [
        ...addTargets.map((g) => ({ text: g.title, onPress: () => setAddingGroup(g) })),
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }, 350);
  }, [addTargets]);

  const reorderInChapter = useCallback(async (chapterId: string, { from, to }: ReorderableListReorderEvent) => {
    if (!eventId) return;
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const moments = reorderItems(chapter.moments, from, to);
    setChapters((cs) => cs.map((c) => (c.id === chapterId ? { ...c, moments } : c)));
    if (!(await reorderSections(eventId, moments.map((m) => m.id)))) {
      Alert.alert(t('timeline.orderFail'), t('common.tryAgain'));
      load();
    }
  }, [eventId, chapters, load]);

  const archive = useCallback(async (chapterId: string, moment: TimelineMoment) => {
    if (!eventId) return;
    setChapters((prev) => prev
      .map((chapter) => (chapter.id === chapterId
        ? { ...chapter, moments: chapter.moments.filter((m) => m.id !== moment.id) }
        : chapter))
      .filter((chapter) => chapter.moments.length > 0));
    setArchived((prev) => [{ id: moment.id, title: moment.title, icon: moment.icon }, ...prev]);
    if (!(await deleteSection(eventId, moment.id))) {
      Alert.alert(t('timeline.archiveFail'), t('common.tryAgain'));
      load();
    }
  }, [eventId, load]);

  const restore = useCallback(async (item: TimelineArchived) => {
    if (!eventId) return;
    setArchived((prev) => prev.filter((x) => x.id !== item.id));
    await restoreSection(eventId, item.id);
    load();
  }, [eventId, load]);

  if (loading || eventLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={Brand.purple} /></View>;
  }

  const ordinal = timeEditing ? momentOrdinal(chapters, timeEditing.id, locale) : null;

  return (
    <View style={{ flex: 1 }}>
      <TimelineBoard
        dateLabel={formatTimelineDate(event?.event_date, locale)}
        chapters={chapters}
        archived={archived}
        canManage={canManage}
        reordering={reordering}
        coach={coach}
        menuOpen={menuOpen}
        uploadBusy={ptBusy}
        onToggleReorder={() => setReordering((v) => !v)}
        onPressPlus={openMenu}
        onDismissCoach={dismissCoach}
        onCloseMenu={() => setMenuOpen(false)}
        onNewMoment={startNew}
        onUpload={startUpload}
        onPressMoment={(moment) => {
          if (!eventId) return;
          router.push({ pathname: '/section/[id]', params: { id: moment.id, eventId } });
        }}
        onPressTime={setTimeEditing}
        onArchive={archive}
        onRestore={restore}
        onReorder={(chapterId, from, to) => reorderInChapter(chapterId, { from, to })}
      />
      <TimePickerSheet
        visible={timeEditing !== null}
        initial={timeEditing?.timeLabel ?? null}
        title={t('time.title')}
        subtitle={timeEditing ? [timeEditing.title, ordinal].filter(Boolean).join(' · ') : undefined}
        onClose={() => setTimeEditing(null)}
        onSave={(time) => { if (timeEditing) saveTime(timeEditing, time); }}
      />
      <AddSectionSheet
        visible={!!addingGroup}
        eventId={eventId ?? ''}
        groupId={addingGroup?.id ?? ''}
        groupTitle={addingGroup?.title}
        onClose={() => setAddingGroup(null)}
        onAdded={load}
      />
    </View>
  );
}
