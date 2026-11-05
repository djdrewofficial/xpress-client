import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AddSectionSheet } from '@/components/AddSectionSheet';
import { GroupBody, groupSubtitle } from '@/components/plan/GroupBody';
import { chapterStatus } from '@/components/plan/model';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
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
  const router = useRouter();
  const { profile } = useAuth();
  const { id, eventId, title } = useLocalSearchParams<{ id: string; eventId: string; title: string }>();
  const [group, setGroup] = useState<Group | null>(null);
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
    const g = ov.groups.find((x) => x.id === id) ?? null;
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
    if (!ok) { Alert.alert('Could not reorder', 'Please try again.'); load(); }
  };

  const confirmDelete = (sectionId: string) => {
    const s = sections?.find((x) => x.id === sectionId);
    if (!s) return;
    Alert.alert(
      isStaff ? 'Delete moment?' : 'Remove moment?',
      isStaff ? `Permanently delete "${s.title}"? This cannot be undone.` : `Remove "${s.title}" from your plan? You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isStaff ? 'Delete' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSections((prev) => (prev ?? []).filter((x) => x.id !== s.id));
            setBusy(true);
            const ok = await deleteSection(eventId, s.id);
            setBusy(false);
            if (!ok) Alert.alert('Could not remove', 'Please try again.');
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
    if (!ok) Alert.alert('Could not restore', 'Please try again.');
    load();
  };

  const status = group ? chapterStatus(group) : null;
  const heading = group?.title ?? title ?? 'Moments';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GroupBody
        title={heading}
        subtitle={groupSubtitle(sections?.length ?? 0, status?.label ?? null)}
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
          time: s.time_label,
          meta: s.songCount > 0 ? `${s.songCount} ${s.songCount === 1 ? 'song' : 'songs'}` : 'No songs',
          badge: s.questionCount > 0
            ? s.answeredCount >= s.questionCount ? 'done' : `${s.answeredCount}/${s.questionCount}`
            : undefined,
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
