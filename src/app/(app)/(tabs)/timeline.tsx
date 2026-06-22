import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { BrandHeader } from '@/components/Logo';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, reorderSections, setSectionOnTimeline, setSectionTime, onTimeline, type SectionRow } from '@/lib/planning';
import { getPlannerTimeline, pickAndUploadPlannerTimeline, type PlannerTimelineFile } from '@/lib/eventFiles';

type TLGroup = { id: string; title: string; icon: string | null; on: SectionRow[] };
type OffItem = { section: SectionRow; groupId: string; groupTitle: string };

export default function TimelineScreen() {
  const c = useC();
  const { profile } = useAuth();
  const [eventId, setEventId] = useState<string | null>(null);
  const [groups, setGroups] = useState<TLGroup[]>([]);
  const [off, setOff] = useState<OffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeEditing, setTimeEditing] = useState<SectionRow | null>(null);
  const [pt, setPt] = useState<PlannerTimelineFile>(null);
  const [ptBusy, setPtBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEventId(ev?.id ?? null);
    if (ev) {
      const [ov, plannerFile] = await Promise.all([loadOverview(ev.id), getPlannerTimeline(ev.id)]);
      const g: TLGroup[] = [];
      const offList: OffItem[] = [];
      for (const grp of ov.groups) {
        const on = grp.sections.filter(onTimeline);
        g.push({ id: grp.id, title: grp.title, icon: grp.icon, on });
        for (const s of grp.sections) if (!onTimeline(s)) offList.push({ section: s, groupId: grp.id, groupTitle: grp.title });
      }
      setGroups(g);
      setOff(offList);
      setPt(plannerFile);
    }
    setLoading(false);
  }, [profile]);
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

  const hide = useCallback((groupId: string, groupTitle: string, s: SectionRow) => {
    if (!eventId) return;
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, on: g.on.filter((x) => x.id !== s.id) } : g)));
    setOff((prev) => [{ section: { ...s, on_timeline: false }, groupId, groupTitle }, ...prev]);
    setSectionOnTimeline(eventId, s.id, false);
  }, [eventId]);

  const addBack = useCallback(async (item: OffItem) => {
    if (!eventId) return;
    setOff((prev) => prev.filter((x) => x.section.id !== item.section.id));
    await setSectionOnTimeline(eventId, item.section.id, true);
    load(); // re-fetch so it lands back in its correct order slot
  }, [eventId, load]);

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;

  const hasAny = groups.some((g) => g.on.length > 0) || off.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <BrandHeader />
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
                The flow of your night, by category. Press &amp; hold to drag a moment into place, or swipe to take it off your timeline.
              </Text>
            </View>

            {/* Official timeline from the planner — optional */}
            <View style={[styles.planner, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.offLab, { color: c.textTertiary }]}>OFFICIAL PLANNER TIMELINE</Text>
              {pt ? (
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

            {groups.map((g) => g.on.length > 0 && (
              <View key={g.id} style={{ marginBottom: Space.lg }}>
                <View style={styles.catHead}>
                  {g.icon ? <Text style={{ fontSize: 16 }}>{g.icon}</Text> : null}
                  <Text style={[styles.catTitle, { color: Brand.purpleLight }]}>{g.title.toUpperCase()}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: c.textTertiary, fontSize: 12, fontWeight: '600' }}>{g.on.length}</Text>
                </View>
                <NestedReorderableList
                  data={g.on}
                  keyExtractor={(s) => s.id}
                  onReorder={(e) => reorderInGroup(g.id, e)}
                  contentContainerStyle={{ gap: Space.sm }}
                  renderItem={({ item }) => <Row section={item} onHide={() => hide(g.id, g.title, item)} onEditTime={() => setTimeEditing(item)} c={c} />}
                />
              </View>
            ))}

            {off.length > 0 && (
              <View style={{ marginTop: Space.md, gap: Space.sm }}>
                <Text style={[styles.offLab, { color: c.textTertiary }]}>NOT ON YOUR TIMELINE</Text>
                <Text style={{ color: c.textTertiary, fontSize: 12, lineHeight: 17, marginBottom: 2 }}>
                  These are still part of your plan — they just don&apos;t show on your event timeline. Add any of them back anytime.
                </Text>
                {off.map((item) => (
                  <View key={item.section.id} style={[styles.offRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                    <Text style={{ fontSize: 18, opacity: 0.7 }}>{item.section.icon ?? '•'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textSecondary, fontSize: 15 }} numberOfLines={1}>{item.section.title}</Text>
                      <Text style={{ color: c.textTertiary, fontSize: 11 }}>{item.groupTitle}</Text>
                    </View>
                    <Pressable onPress={() => addBack(item)} hitSlop={8} style={[styles.addBtn, { borderColor: Brand.purple }]}>
                      <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>＋ Add</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollViewContainer>
        )}
      </SafeAreaView>
      <TimePickerSheet
        visible={timeEditing !== null}
        initial={timeEditing?.time_label ?? null}
        title={timeEditing ? `${timeEditing.title} time` : 'Set time'}
        onClose={() => setTimeEditing(null)}
        onSave={(time) => { if (timeEditing) saveTime(timeEditing, time); }}
      />
    </View>
  );
}

function Row({ section, onHide, onEditTime, c }: { section: SectionRow; onHide: () => void; onEditTime: () => void; c: ReturnType<typeof useC> }) {
  const drag = useReorderableDrag();
  const active = useIsActive();
  const swipe = useRef<SwipeableMethods>(null);

  const meta = [
    section.questionCount > 0 ? `${section.answeredCount}/${section.questionCount} answered` : null,
    section.songCount > 0 ? `${section.songCount} ${section.songCount === 1 ? 'song' : 'songs'}` : null,
  ].filter(Boolean).join('  ·  ');

  const confirmHide = () => {
    Alert.alert(
      'Take off your timeline?',
      `"${section.title}" will be hidden from your event timeline. It stays in your plan — this only affects what shows on your timeline.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipe.current?.close() },
        { text: 'Take off timeline', style: 'destructive', onPress: onHide },
      ],
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      leftThreshold={60}
      renderLeftActions={() => (
        <View style={styles.hideAction}><Text style={styles.hideTxt}>✕  Off timeline</Text></View>
      )}
      onSwipeableOpen={confirmHide}>
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
  offLab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  hideAction: { flex: 1, backgroundColor: '#b08400', borderRadius: Radius.lg, justifyContent: 'center', paddingHorizontal: Space.lg },
  hideTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  offRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Space.md },
  addBtn: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  timePill: { borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  planner: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg, marginBottom: Space.lg },
  plannerBtn: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
});
