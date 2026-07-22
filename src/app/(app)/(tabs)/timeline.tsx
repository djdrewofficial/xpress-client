import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  ScrollViewContainer,
  NestedReorderableList,
  useReorderableDrag,
  useIsActive,
  reorderItems,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { useFocusEffect } from 'expo-router';

import { useC } from '@/components/ui';
import { Backdrop } from '@/components/Backdrop';
import { AppHeader } from '@/components/AppHeader';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { AddSectionSheet } from '@/components/AddSectionSheet';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { loadOverview, reorderSections, deleteSection, restoreSection, setSectionTime, onTimeline, type SectionRow, type RemovedSection } from '@/lib/planning';
import { getPlannerTimeline, pickAndUploadPlannerTimeline, type PlannerTimelineFile } from '@/lib/eventFiles';

type TLGroup = { id: string; title: string; icon: string | null; on: SectionRow[] };

export default function TimelineScreen() {
  const c = useC();
  const { profile } = useAuth();
  const { eventId, loading: eventLoading } = useEvent();
  const [groups, setGroups] = useState<TLGroup[]>([]);
  const [archived, setArchived] = useState<RemovedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeEditing, setTimeEditing] = useState<SectionRow | null>(null);
  const [pt, setPt] = useState<PlannerTimelineFile>(null);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptBusy, setPtBusy] = useState(false);
  const [addingGroup, setAddingGroup] = useState<{ id: string; title: string } | null>(null);

  const canManage = profile?.accountType === 'staff' || profile?.accountType === 'client';

  const load = useCallback(async () => {
    if (!eventId) { setGroups([]); setArchived([]); setLoading(false); return; }

    // Render as soon as the overview (fast, direct-to-Supabase) is in.
    const ov = await loadOverview(eventId);
    // Only sections staff have kept on the timeline (info sections are hidden by staff).
    const g: TLGroup[] = ov.groups
      .map((grp) => ({ id: grp.id, title: grp.title, icon: grp.icon, on: grp.sections.filter(onTimeline) }))
      .filter((grp) => grp.on.length > 0);
    setGroups(g);
    setArchived(ov.removed);
    setLoading(false);

    // The planner file only fills the "Official Planner Timeline" card and comes
    // from a slower XOS endpoint (serverless cold starts). Fetch it in the
    // background so it never gates the whole page.
    setPtLoading(true);
    getPlannerTimeline(eventId).then(setPt).catch(() => {}).finally(() => setPtLoading(false));
  }, [eventId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveTime = useCallback((section: SectionRow, time: string | null) => {
    if (!eventId) return;
    setTimeEditing(null);
    setGroups((prev) => prev.map((g) => ({ ...g, on: g.on.map((s) => (s.id === section.id ? { ...s, time_label: time } : s)) })));
    setSectionTime(eventId, section.id, time);
  }, [eventId]);

  const uploadPlanner = useCallback(async () => {
    if (!eventId) return;
    setPtBusy(true);
    try {
      const res = await pickAndUploadPlannerTimeline(eventId);
      if (res) { await load(); Alert.alert('Uploaded ✓', `We saved "${res.name}" and shared it with your Xpress team.`); }
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPtBusy(false);
    }
  }, [eventId, load]);

  const reorderInGroup = useCallback((groupId: string, { from, to }: ReorderableListReorderEvent) => {
    if (!eventId) return;
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const on = reorderItems(g.on, from, to);
      reorderSections(eventId, on.map((s) => s.id));
      return { ...g, on };
    }));
  }, [eventId]);

  // Swipe to archive: removes the section from the couple's timeline AND their
  // plan (host soft-delete). Recoverable from the Archived list below.
  const archive = useCallback((groupId: string, s: SectionRow) => {
    if (!eventId) return;
    setGroups((prev) => prev
      .map((g) => (g.id === groupId ? { ...g, on: g.on.filter((x) => x.id !== s.id) } : g))
      .filter((g) => g.on.length > 0));
    setArchived((prev) => [{ id: s.id, title: s.title, icon: s.icon }, ...prev]);
    deleteSection(eventId, s.id);
  }, [eventId]);

  const restore = useCallback(async (r: RemovedSection) => {
    if (!eventId) return;
    setArchived((prev) => prev.filter((x) => x.id !== r.id));
    await restoreSection(eventId, r.id);
    load(); // re-fetch so it lands back in its correct category + order slot
  }, [eventId, load]);

  if (loading || eventLoading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;

  const hasAny = groups.length > 0 || archived.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <AppHeader />
      <View style={{ flex: 1 }}>
        {!hasAny ? (
          <View style={{ padding: Space.lg }}>
            <Text style={[styles.title, { color: c.text }]}>Timeline</Text>
            <Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: Space.xl }}>
              Your plan sections will appear here once your event is set up.
            </Text>
          </View>
        ) : (
          <ScrollViewContainer contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 4 }}>
            <View style={{ marginBottom: Space.lg }}>
              <Text style={[styles.title, { color: c.text }]}>Timeline</Text>
              <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 2 }}>
                The flow of your night, by category. Press &amp; hold to drag a moment into place, or swipe left to archive one.
              </Text>
            </View>

            {/* Official timeline from the planner — optional */}
            <View style={[styles.planner, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.offLab, { color: c.textTertiary }]}>OFFICIAL PLANNER TIMELINE</Text>
              {ptLoading && !pt ? (
                <ActivityIndicator color={Brand.purple} style={{ marginVertical: Space.md, alignSelf: 'flex-start' }} />
              ) : pt ? (
                <>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>✓ {pt.name}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2, marginBottom: Space.md }}>Shared with your Xpress team. You can replace it anytime.</Text>
                  <Pressable onPress={uploadPlanner} disabled={ptBusy} style={[styles.plannerBtn, { borderColor: Brand.purple }]}>
                    {ptBusy ? <ActivityIndicator color={Brand.purple} /> : <Text style={{ color: Brand.purpleLight, fontWeight: '700' }}>Replace file</Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 4, marginBottom: Space.md, lineHeight: 19 }}>
                    Have a timeline from your wedding planner? Upload it (PDF or photo) and we&apos;ll work from it. No planner or don&apos;t have it yet? No worries — we&apos;ll coordinate with them directly.
                  </Text>
                  <Pressable onPress={uploadPlanner} disabled={ptBusy} style={[styles.plannerBtn, { backgroundColor: Brand.purple, borderColor: Brand.purple }]}>
                    {ptBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>⬆  Upload timeline</Text>}
                  </Pressable>
                </>
              )}
            </View>

            {groups.map((g) => (
              <View key={g.id} style={{ marginBottom: Space.lg }}>
                <View style={styles.catHead}>
                  {g.icon ? <Text style={{ fontSize: 16 }}>{g.icon}</Text> : null}
                  <Text style={[styles.catTitle, { color: Brand.purpleLight }]}>{g.title.toUpperCase()}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: c.textTertiary, fontSize: 12, fontWeight: '600' }}>{g.on.length}</Text>
                  {canManage ? (
                    <Pressable onPress={() => setAddingGroup({ id: g.id, title: g.title })} hitSlop={8} style={[styles.addChip, { borderColor: Brand.purple }]}>
                      <Text style={{ color: Brand.purpleLight, fontSize: 12, fontWeight: '800' }}>＋ Add</Text>
                    </Pressable>
                  ) : null}
                </View>
                <NestedReorderableList
                  data={g.on}
                  keyExtractor={(s) => s.id}
                  onReorder={(e) => reorderInGroup(g.id, e)}
                  contentContainerStyle={{ gap: Space.sm }}
                  renderItem={({ item }) => <Row section={item} onArchive={() => archive(g.id, item)} onEditTime={() => setTimeEditing(item)} c={c} />}
                />
              </View>
            ))}

            {archived.length > 0 && (
              <View style={{ marginTop: Space.md, gap: Space.sm }}>
                <Text style={[styles.offLab, { color: c.textTertiary }]}>ARCHIVED · {archived.length}</Text>
                <Text style={{ color: c.textTertiary, fontSize: 12, lineHeight: 17, marginBottom: 2 }}>
                  Archived sections are removed from your timeline and plan. Restore any of them anytime.
                </Text>
                {archived.map((r) => (
                  <View key={r.id} style={[styles.offRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                    <Text style={{ fontSize: 18, opacity: 0.6 }}>{r.icon ?? '•'}</Text>
                    <Text style={{ flex: 1, color: c.textSecondary, fontSize: 15, textDecorationLine: 'line-through' }} numberOfLines={1}>{r.title}</Text>
                    <Pressable onPress={() => restore(r)} hitSlop={8} style={[styles.addBtn, { borderColor: Brand.purple }]}>
                      <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>Restore</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollViewContainer>
        )}
      </View>
      <TimePickerSheet
        visible={timeEditing !== null}
        initial={timeEditing?.time_label ?? null}
        title={timeEditing ? `${timeEditing.title} time` : 'Set time'}
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

function Row({ section, onArchive, onEditTime, c }: { section: SectionRow; onArchive: () => void; onEditTime: () => void; c: ReturnType<typeof useC> }) {
  const drag = useReorderableDrag();
  const active = useIsActive();
  const swipe = useRef<SwipeableMethods>(null);

  const meta = [
    section.questionCount > 0 ? `${section.answeredCount}/${section.questionCount} answered` : null,
    section.songCount > 0 ? `${section.songCount} ${section.songCount === 1 ? 'song' : 'songs'}` : null,
  ].filter(Boolean).join('  ·  ');

  const confirmArchive = () => {
    Alert.alert(
      'Archive this section?',
      `"${section.title}" will be removed from your timeline and your plan. You can restore it anytime from the Archived list.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipe.current?.close() },
        { text: 'Archive', style: 'destructive', onPress: onArchive },
      ],
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={60}
      renderRightActions={() => (
        <View style={styles.archiveAction}><Text style={styles.archiveTxt}>🗑  Archive</Text></View>
      )}
      onSwipeableOpen={confirmArchive}>
      <Pressable
        onLongPress={drag}
        delayLongPress={180}
        style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: active ? Brand.purple : c.border, opacity: active ? 0.95 : 1 }]}>
        <Text style={{ color: c.textTertiary, fontSize: 20, fontWeight: '700' }}>≡</Text>
        <Text style={{ fontSize: 22 }}>{section.icon ?? '🎵'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{section.title}</Text>
          {meta ? <Text style={{ color: c.textTertiary, fontSize: 12, marginTop: 1 }}>{meta}</Text> : null}
        </View>
        {section.time_enabled && !section.locked ? (
          <Pressable onPress={onEditTime} hitSlop={6} style={[styles.timePill, section.time_label ? { backgroundColor: Brand.purple } : { borderWidth: 1, borderColor: Brand.purple }]}>
            <Text style={{ color: section.time_label ? '#fff' : Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>
              {section.time_label ?? '＋ Time'}
            </Text>
          </Pressable>
        ) : section.time_label ? (
          <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>{section.time_label}</Text>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontFamily: Fonts.display },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginBottom: Space.sm },
  catTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  addChip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10, marginLeft: 8 },
  offLab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  archiveAction: { flex: 1, backgroundColor: '#e0584f', borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: Space.lg },
  archiveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  offRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Space.md },
  addBtn: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  timePill: { borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  planner: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg, marginBottom: Space.lg },
  plannerBtn: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
});
