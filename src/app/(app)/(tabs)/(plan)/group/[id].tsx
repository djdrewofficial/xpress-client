import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AddSectionSheet } from '@/components/AddSectionSheet';
import { GroupBody } from '@/components/plan/GroupBody';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import {
  deleteSection,
  loadOverview,
  reorderSections,
  restoreSection,
  type Group,
  type RemovedSection,
  type SectionRow,
} from '@/lib/planning';

export default function GroupScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const { id, eventId, title } = useLocalSearchParams<{ id: string; eventId: string; title: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [sections, setSections] = useState<SectionRow[] | null>(null);
  const [removed, setRemoved] = useState<RemovedSection[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const isStaff = profile?.accountType === 'staff';
  const canManage = isStaff || profile?.accountType === 'client';

  const load = useCallback(async () => {
    if (!eventId) return;
    const ov = await loadOverview(eventId);
    const index = ov.groups.findIndex((x) => x.id === id);
    const g = index >= 0 ? ov.groups[index] : null;
    setChapterNumber(index >= 0 ? index + 1 : null);
    setGroup(g);
    setSections(g?.sections ?? []);
    setRemoved(ov.removed);
  }, [eventId, id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const move = async (index: number, dir: -1 | 1) => {
    if (!sections) return;
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[index], next[j]] = [next[j], next[index]];
    setSections(next);
    setBusy(true);
    const ok = await reorderSections(eventId, next.map((s) => s.id));
    setBusy(false);
    if (!ok) { Alert.alert(t('group.reorderFail'), t('common.tryAgain')); load(); }
  };

  const confirmDelete = (sectionId: string) => {
    const s = sections?.find((x) => x.id === sectionId);
    if (!s) return;
    Alert.alert(
      isStaff ? t('group.deleteTitle') : t('group.removeTitle'),
      isStaff ? t('group.deleteBody', { title: s.title }) : t('group.removeBody', { title: s.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isStaff ? t('common.delete') : t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            setSections((prev) => (prev ?? []).filter((x) => x.id !== s.id));
            setBusy(true);
            const ok = await deleteSection(eventId, s.id);
            setBusy(false);
            if (!ok) Alert.alert(t('group.removeFail'), t('common.tryAgain'));
            load();
          },
        },
      ],
    );
  };

  const onRestore = async (rid: string) => {
    const r = removed.find((x) => x.id === rid);
    if (!r) return;
    setRemoved((prev) => prev.filter((x) => x.id !== r.id));
    setBusy(true);
    const ok = await restoreSection(eventId, r.id);
    setBusy(false);
    if (!ok) Alert.alert(t('group.restoreFail'), t('common.tryAgain'));
    load();
  };

  const heading = group?.title ?? title ?? t('group.momentsTitle');
  const momentsDone = (sections ?? []).filter(momentDone).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GroupBody
        title={heading}
        chapterNumber={chapterNumber}
        description={group?.intro?.trim() || null}
        momentsDone={momentsDone}
        momentsTotal={sections?.length ?? 0}
        questionsAnswered={group?.answeredQuestions ?? 0}
        questionsTotal={group?.totalQuestions ?? 0}
        onBack={() => router.back()}
        canManage={canManage}
        editing={editing}
        onToggleEdit={() => setEditing((e) => !e)}
        loading={!sections}
        busy={busy}
        moments={(sections ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          icon: s.icon,
          meta: momentMeta(s, t),
          done: momentDone(s),
        }))}
        onOpen={(sectionId) => router.push({ pathname: '/section/[id]', params: { id: sectionId, eventId, from: heading } })}
        onMove={move}
        onDelete={confirmDelete}
        onAdd={() => setAdding(true)}
        removed={removed}
        onRestore={onRestore}
      />
      <AddSectionSheet
        visible={adding}
        eventId={eventId}
        groupId={id}
        groupTitle={heading}
        onClose={() => setAdding(false)}
        onAdded={load}
      />
    </View>
  );
}

function momentDone(section: SectionRow): boolean {
  if (section.questionCount > 0) return section.answeredCount >= section.questionCount;
  if (section.songs_enabled) return section.songCount > 0;
  return false;
}

function momentMeta(section: SectionRow, t: ReturnType<typeof useT>['t']): string {
  const bits: string[] = [];
  if (section.questionCount > 0) bits.push(t('group.answeredOf', { answered: section.answeredCount, total: section.questionCount }));
  if (section.songs_enabled && section.songCount > 0) {
    bits.push(section.songCount === 1 ? t('group.oneSong') : t('group.nSongs', { count: section.songCount }));
  }
  if (section.hasNotes) bits.push(t('group.notesAdded'));
  return bits.join(' · ');
}
