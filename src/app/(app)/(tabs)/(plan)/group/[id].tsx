import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
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

  // Gentle "dancing" bounce for the mascot.
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 460, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t]);
  const danceY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const danceR = t.interpolate({ inputRange: [0, 1], outputRange: ['-9deg', '9deg'] });

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

  const confirmDelete = (s: SectionRow) => {
    Alert.alert(
      isStaff ? 'Delete section?' : 'Remove section?',
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

  const onRestore = async (r: RemovedSection) => {
    setRemoved((prev) => prev.filter((x) => x.id !== r.id));
    setBusy(true);
    const ok = await restoreSection(eventId, r.id);
    setBusy(false);
    if (!ok) Alert.alert('Could not restore', 'Please try again.');
    load();
  };

  // Category-level progress for the header.
  const totalQ = group?.totalQuestions ?? 0;
  const ansQ = group?.answeredQuestions ?? 0;
  const catPct = totalQ > 0 ? Math.round((ansQ / totalQ) * 100) : (group?.songCount ?? 0) > 0 ? 100 : 0;
  const doneCount = (sections ?? []).filter((s) => s.questionCount > 0 && s.answeredCount === s.questionCount).length;
  const total = sections?.length ?? 0;
  const allDone = total > 0 && doneCount === total;
  const cheer = allDone
    ? "Woof! You've finished this section! 🎉"
    : catPct > 50
      ? "Pawsitively crushing it — keep going! 🐾"
      : total > 0
        ? "Your pup's cheering you on! 🐾"
        : 'Nothing to fill out here yet.';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Header ── */}
      <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.hdrRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>‹</Text>
              <Text style={{ color: '#fff', fontSize: 16 }}>Back</Text>
            </Pressable>
            {canManage && (sections?.length || removed.length) ? (
              <Pressable onPress={() => setEditing((e) => !e)} hitSlop={12} style={[styles.editBtn, { backgroundColor: editing ? '#fff' : 'rgba(255,255,255,0.22)' }]}>
                <Text style={{ color: editing ? Brand.purple : '#fff', fontSize: 13, fontWeight: '800' }}>{editing ? 'Done' : 'Edit'}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.hdrBody}>
            <View style={styles.hdrIcon}><Text style={{ fontSize: 30 }}>{group?.icon ?? '✨'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hdrTitle} numberOfLines={2}>{group?.title ?? title ?? 'Sections'}</Text>
              <Text style={styles.hdrSub}>
                {total > 0 ? `${doneCount} of ${total} section${total === 1 ? '' : 's'} done` : 'Let’s plan this part'}
                {group?.songCount ? `  ·  ${group.songCount} song${group.songCount === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
            {totalQ > 0 && (
              <View style={styles.hdrPctPill}><Text style={styles.hdrPct}>{catPct}%</Text></View>
            )}
          </View>
          {totalQ > 0 && (
            <View style={styles.hdrBarWrap}><Bar pct={catPct} height={7} track="rgba(255,255,255,0.28)" /></View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 3, gap: Space.md }}>
        {editing && (
          <Text style={{ color: c.textTertiary, fontSize: 12 }}>
            Reorder with the arrows, or {isStaff ? 'delete' : 'remove'} sections. {busy ? 'Saving…' : ''}
          </Text>
        )}

        {!sections ? (
          <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
        ) : (
          sections.map((s, i) => {
            const complete = s.questionCount > 0 && s.answeredCount === s.questionCount;
            const pct = s.questionCount > 0 ? Math.round((s.answeredCount / s.questionCount) * 100) : s.songCount > 0 ? 100 : 0;

            const inner = (
              <View style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: complete ? Brand.purple + '55' : c.border }]}>
                {editing ? (
                  <View style={{ justifyContent: 'center', gap: 2 }}>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0 || busy} hitSlop={6} style={styles.arrow}>
                      <Text style={{ color: i === 0 ? c.textTertiary : Brand.purpleLight, fontSize: 18, fontWeight: '800' }}>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => move(i, 1)} disabled={i === sections.length - 1 || busy} hitSlop={6} style={styles.arrow}>
                      <Text style={{ color: i === sections.length - 1 ? c.textTertiary : Brand.purpleLight, fontSize: 18, fontWeight: '800' }}>↓</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.icon, { backgroundColor: complete ? '#22c55e22' : c.cardAlt }]}>
                    <Text style={{ fontSize: 22 }}>{complete ? '✅' : s.icon ?? '•'}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 7 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                  {s.questionCount > 0 && <Bar pct={pct} height={5} track={c.cardAlt} />}
                  <View style={styles.chipRow}>
                    {s.questionCount > 0 && (
                      <View style={[styles.chip, { backgroundColor: complete ? '#22c55e1f' : c.cardAlt }]}>
                        <Text style={{ color: complete ? '#16a34a' : c.textSecondary, fontSize: 11.5, fontWeight: '700' }}>
                          {complete ? '✓ All answered' : `${s.answeredCount}/${s.questionCount} answered`}
                        </Text>
                      </View>
                    )}
                    {s.songCount > 0 && (
                      <View style={[styles.chip, { backgroundColor: c.cardAlt }]}>
                        <Text style={{ color: c.textSecondary, fontSize: 11.5, fontWeight: '700' }}>🎵 {s.songCount}</Text>
                      </View>
                    )}
                    {s.questionCount === 0 && s.songCount === 0 && (
                      <Text style={{ color: c.textTertiary, fontSize: 12, fontWeight: '600' }}>Tap to open</Text>
                    )}
                  </View>
                </View>
                {editing ? (
                  <Pressable onPress={() => confirmDelete(s)} disabled={busy} hitSlop={8} style={styles.trash}>
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: c.textTertiary, fontSize: 22, marginLeft: 4 }}>›</Text>
                )}
              </View>
            );

            return editing ? (
              <View key={s.id}>{inner}</View>
            ) : (
              <Pressable
                key={s.id}
                onPress={() => router.push({ pathname: '/section/[id]', params: { id: s.id, eventId } })}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
                {inner}
              </Pressable>
            );
          })
        )}

        {sections && sections.length === 0 && (
          <Text style={{ color: c.textTertiary, fontSize: 13, paddingVertical: Space.md }}>No sections here.</Text>
        )}

        {/* Removed sections — restore (staff/host) */}
        {canManage && editing && removed.length > 0 && (
          <View style={{ marginTop: Space.lg, gap: Space.sm }}>
            <Text style={[styles.lab, { color: c.textTertiary }]}>REMOVED SECTIONS</Text>
            {removed.map((r) => (
              <View key={r.id} style={[styles.removedRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                <Text style={{ fontSize: 18 }}>{r.icon ?? '•'}</Text>
                <Text style={{ flex: 1, color: c.textSecondary, fontSize: 15 }} numberOfLines={1}>{r.title}</Text>
                <Pressable onPress={() => onRestore(r)} disabled={busy} style={styles.restoreBtn}>
                  <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>Restore</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Dancing mascot fills the empty space */}
        {sections && !editing && (
          <View style={styles.mascot}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ fontSize: 22, opacity: 0.7 }}>🎶</Text>
              <Animated.Text style={{ fontSize: 68, transform: [{ translateY: danceY }, { rotate: danceR }] }}>🐶</Animated.Text>
              <Text style={{ fontSize: 22, opacity: 0.7 }}>🎶</Text>
            </View>
            <Text style={{ color: c.textTertiary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: Space.sm }}>{cheer}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingTop: Space.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill },
  hdrBody: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.lg, paddingTop: Space.md },
  hdrIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  hdrSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  hdrPctPill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  hdrPct: { color: '#fff', fontSize: 15, fontWeight: '800' },
  hdrBarWrap: { paddingHorizontal: Space.lg, paddingTop: Space.md, paddingBottom: Space.lg },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  arrow: { width: 40, height: 24, alignItems: 'center', justifyContent: 'center' },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  removedRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', paddingVertical: Space.sm, paddingHorizontal: Space.md },
  restoreBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  mascot: { alignItems: 'center', justifyContent: 'center', paddingTop: Space.xxl, paddingBottom: Space.lg },
});
