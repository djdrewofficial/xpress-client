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
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, reorderSections, setSectionOnTimeline, onTimeline, type SectionRow } from '@/lib/planning';

type TLGroup = { id: string; title: string; icon: string | null; on: SectionRow[] };
type OffItem = { section: SectionRow; groupId: string; groupTitle: string };

export default function TimelineScreen() {
  const c = useC();
  const { profile } = useAuth();
  const [eventId, setEventId] = useState<string | null>(null);
  const [groups, setGroups] = useState<TLGroup[]>([]);
  const [off, setOff] = useState<OffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEventId(ev?.id ?? null);
    if (ev) {
      const ov = await loadOverview(ev.id);
      const g: TLGroup[] = [];
      const offList: OffItem[] = [];
      for (const grp of ov.groups) {
        const on = grp.sections.filter(onTimeline);
        g.push({ id: grp.id, title: grp.title, icon: grp.icon, on });
        for (const s of grp.sections) if (!onTimeline(s)) offList.push({ section: s, groupId: grp.id, groupTitle: grp.title });
      }
      setGroups(g);
      setOff(offList);
    }
    setLoading(false);
  }, [profile]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
                  renderItem={({ item }) => <Row section={item} onHide={() => hide(g.id, g.title, item)} c={c} />}
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
    </View>
  );
}

function Row({ section, onHide, c }: { section: SectionRow; onHide: () => void; c: ReturnType<typeof useC> }) {
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
});
