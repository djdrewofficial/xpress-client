import { useMemo, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ThemeSchemeOverride } from '@/components/ui';
import { formatEventEyebrow } from '@/lib/eventDate';
import { useDevLocale } from '@/lib/devLocale';
import { useT } from '@/lib/i18n';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { TimelineBoard, type TimelineArchived, type TimelineChapter, type TimelineMoment } from '@/components/TimelineBoard';
import { reorderItems } from 'react-native-reorderable-list';
import type { Scheme } from '@/lib/theme';

/**
 * Dev-only Timeline fixture. Renders the real board with sample moments so the
 * screen can be checked without a signed-in event. Not linked from the app.
 *
 * /dev/timeline?state=default|reorder|menu|coach|time|empty|guest|archive|dark
 */
export default function DevTimelineRoute() {
  useDevLocale();
  const { state } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/login" />;
  const name = state ?? 'default';
  const scheme: Scheme = name === 'dark' ? 'dark' : 'light';
  return (
    <ThemeSchemeOverride scheme={scheme}>
      <Preview state={name === 'dark' ? 'default' : name} />
    </ThemeSchemeOverride>
  );
}

function moment(partial: Pick<TimelineMoment, 'id' | 'title' | 'icon' | 'timeLabel'> & Partial<TimelineMoment>): TimelineMoment {
  return {
    timeEnabled: true,
    locked: false,
    meta: '1 song',
    ...partial,
  };
}

const SAMPLE: TimelineChapter[] = [
  {
    id: 'ceremony',
    title: 'Ceremony',
    moments: [
      moment({ id: 'processional', title: 'Processional', icon: 'users', timeLabel: null, meta: '1 song', badge: 'done' }),
      moment({ id: 'vows', title: 'Vows', icon: 'rings', timeLabel: '4:15 PM', meta: 'No songs', badge: '2/2' }),
      moment({ id: 'recessional', title: 'Recessional', icon: 'heart', timeLabel: null, timeEnabled: false, meta: '1 song', badge: 'done' }),
    ],
  },
  {
    id: 'cocktail',
    title: 'Cocktail hour',
    moments: [
      moment({ id: 'cocktails', title: 'Cocktails', icon: 'toast', timeLabel: '4:45 PM', meta: '24 songs', badge: '3/5' }),
    ],
  },
  {
    id: 'reception',
    title: 'Reception',
    moments: [
      moment({ id: 'entrance', title: 'Grand Entrance', icon: 'mic', timeLabel: '5:30 PM', meta: '2 songs', badge: '3/5' }),
      moment({ id: 'first-dance', title: 'First Dance', icon: 'first-dance', timeLabel: '5:45 PM', meta: '1 song', badge: '1/4' }),
      moment({ id: 'cake', title: 'Cake Cutting', icon: 'cake', timeLabel: null, meta: 'No songs', badge: '0/3' }),
      moment({ id: 'bouquet', title: 'Bouquet Toss', icon: 'gem', timeLabel: '8:30 PM', meta: 'No songs', badge: '0/2' }),
      moment({ id: 'last-dance', title: 'Last Dance', icon: 'heart', timeLabel: '10:45 PM', meta: '1 song', badge: '1/2' }),
    ],
  },
];

const SAMPLE_ARCHIVED: TimelineArchived[] = [
  { id: 'garter', title: 'Garter toss', icon: 'party' },
];

function Preview({ state }: { state: string }) {
  const { locale } = useT();
  const initialChapters = state === 'empty' ? [] : SAMPLE;
  const [chapters, setChapters] = useState<TimelineChapter[]>(initialChapters);
  const [archived, setArchived] = useState<TimelineArchived[]>(state === 'archive' ? SAMPLE_ARCHIVED : []);
  const [reordering, setReordering] = useState(state === 'reorder');
  const [menuOpen, setMenuOpen] = useState(state === 'menu');
  const [coach, setCoach] = useState(state === 'coach');
  const [timeEditing, setTimeEditing] = useState<TimelineMoment | null>(
    state === 'time' ? SAMPLE[2].moments[2] : null,
  );
  const canManage = state !== 'guest';

  const ordinal = useMemo(() => {
    if (!timeEditing) return null;
    let n = 0;
    for (const chapter of chapters) {
      for (const item of chapter.moments) {
        n += 1;
        if (item.id === timeEditing.id) return `Moment ${String(n).padStart(2, '0')}`;
      }
    }
    return null;
  }, [chapters, timeEditing]);

  return (
    <>
      <TimelineBoard
        dateLabel={formatEventEyebrow('2027-06-13', locale)}
        chapters={chapters}
        archived={archived}
        canManage={canManage}
        reordering={reordering}
        coach={coach}
        menuOpen={menuOpen}
        uploadBusy={false}
        onToggleReorder={() => setReordering((v) => !v)}
        onPressPlus={() => { setCoach(false); setMenuOpen(true); }}
        onDismissCoach={() => setCoach(false)}
        onCloseMenu={() => setMenuOpen(false)}
        onNewMoment={() => setMenuOpen(false)}
        onUpload={() => setMenuOpen(false)}
        onPressMoment={() => {}}
        onPressTime={setTimeEditing}
        onArchive={(chapterId, item) => {
          setChapters((prev) => prev
            .map((chapter) => (chapter.id === chapterId
              ? { ...chapter, moments: chapter.moments.filter((m) => m.id !== item.id) }
              : chapter))
            .filter((chapter) => chapter.moments.length > 0));
          setArchived((prev) => [{ id: item.id, title: item.title, icon: item.icon }, ...prev]);
        }}
        onRestore={(item) => setArchived((prev) => prev.filter((x) => x.id !== item.id))}
        onReorder={(chapterId, from, to) => {
          setChapters((prev) => prev.map((chapter) => (
            chapter.id === chapterId ? { ...chapter, moments: reorderItems(chapter.moments, from, to) } : chapter
          )));
        }}
      />
      <TimePickerSheet
        visible={timeEditing !== null}
        initial={timeEditing?.timeLabel ?? null}
        title="Set time"
        subtitle={timeEditing ? [timeEditing.title, ordinal].filter(Boolean).join(' · ') : undefined}
        onClose={() => setTimeEditing(null)}
        onSave={(time) => {
          if (!timeEditing) return;
          const id = timeEditing.id;
          setChapters((prev) => prev.map((chapter) => ({
            ...chapter,
            moments: chapter.moments.map((m) => (m.id === id ? { ...m, timeLabel: time } : m)),
          })));
          setTimeEditing(null);
        }}
      />
    </>
  );
}
