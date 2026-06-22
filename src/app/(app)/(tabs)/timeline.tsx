import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReorderableList, { useReorderableDrag, useIsActive, reorderItems, type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { useFocusEffect } from 'expo-router';

import { useC } from '@/components/ui';
import { Backdrop } from '@/components/Backdrop';
import { BrandHeader } from '@/components/Logo';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, reorderSections, deleteSection, restoreSection, type SectionRow, type RemovedSection } from '@/lib/planning';


export default function TimelineScreen() {
  const c = useC();
  const { profile } = useAuth();
  const [eventId, setEventId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [removed, setRemoved] = useState<RemovedSection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEventId(ev?.id ?? null);
    if (ev) {
      const ov = await loadOverview(ev.id);
      setSections(ov.sections);
      setRemoved(ov.removed);
    }
    setLoading(false);
  }, [profile]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onReorder = useCallback(({ from, to }: ReorderableListReorderEvent) => {
    if (!eventId) return;
    setSections((prev) => {
      const next = reorderItems(prev, from, to);
      reorderSections(eventId, next.map((s) => s.id));
      return next;
    });
  }, [eventId]);

  const remove = useCallback((s: SectionRow) => {
    if (!eventId) return;
    setSections((prev) => prev.filter((x) => x.id !== s.id));
    setRemoved((prev) => [{ id: s.id, title: s.title, icon: s.icon }, ...prev]);
    deleteSection(eventId, s.id);
  }, [eventId]);

  const restore = useCallback(async (r: RemovedSection) => {
    if (!eventId) return;
    setRemoved((prev) => prev.filter((x) => x.id !== r.id));
    await restoreSection(eventId, r.id);
    load();
  }, [eventId, load]);

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;

  const Header = (
    <View style={{ marginBottom: Space.md }}>
      <Text style={[styles.title, { color: c.text }]}>Timeline</Text>
      <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 2 }}>
        This is the order of your night. Press &amp; hold to drag a section into place, or swipe right to remove one.
      </Text>
    </View>
  );

  const Footer = removed.length > 0 ? (
    <View style={{ marginTop: Space.xl, gap: Space.sm }}>
      <Text style={[styles.lab, { color: c.textTertiary }]}>REMOVED · {removed.length}</Text>
      {removed.map((r) => (
        <View key={r.id} style={[styles.removedRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
          <Text style={{ fontSize: 18, opacity: 0.6 }}>{r.icon ?? '•'}</Text>
          <Text style={{ flex: 1, color: c.textSecondary, fontSize: 15, textDecorationLine: 'line-through' }} numberOfLines={1}>{r.title}</Text>
          <Pressable onPress={() => restore(r)} hitSlop={8} style={[styles.restoreBtn, { borderColor: Brand.purple }]}>
            <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>Restore</Text>
          </Pressable>
        </View>
      ))}
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <BrandHeader />
        {sections.length === 0 ? (
          <View style={{ padding: Space.lg }}>
            {Header}
            <Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: Space.xl }}>
              Your plan sections will appear here once your event is set up.
            </Text>
            {Footer}
          </View>
        ) : (
          <ReorderableList
            data={sections}
            keyExtractor={(s) => s.id}
            onReorder={onReorder}
            ListHeaderComponent={Header}
            ListFooterComponent={Footer}
            contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 4, gap: Space.sm }}
            renderItem={({ item }) => <Row section={item} onRemove={remove} c={c} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function Row({ section, onRemove, c }: { section: SectionRow; onRemove: (s: SectionRow) => void; c: ReturnType<typeof useC> }) {
  const drag = useReorderableDrag();
  const active = useIsActive();
  const swipe = useRef<SwipeableMethods>(null);

  const meta = [
    section.questionCount > 0 ? `${section.answeredCount}/${section.questionCount} answered` : null,
    section.songCount > 0 ? `${section.songCount} ${section.songCount === 1 ? 'song' : 'songs'}` : null,
  ].filter(Boolean).join('  ·  ');

  const confirmRemove = () => {
    Alert.alert('Remove section?', `"${section.title}" will be removed from your plan. You can restore it from the bottom of this screen.`, [
      { text: 'Cancel', style: 'cancel', onPress: () => swipe.current?.close() },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(section) },
    ]);
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      leftThreshold={60}
      renderLeftActions={() => (
        <View style={styles.deleteAction}><Text style={styles.deleteTxt}>🗑  Remove</Text></View>
      )}
      onSwipeableOpen={confirmRemove}
    >
      <Pressable
        onLongPress={drag}
        delayLongPress={180}
        style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: active ? Brand.purple : c.border, opacity: active ? 0.95 : 1 }]}
      >
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
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  deleteAction: { flex: 1, backgroundColor: '#e0584f', borderRadius: Radius.lg, justifyContent: 'center', paddingHorizontal: Space.lg, marginBottom: 0 },
  deleteTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  removedRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Space.md },
  restoreBtn: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
});
