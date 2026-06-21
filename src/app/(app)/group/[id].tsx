import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import {
  deleteSection,
  loadOverview,
  reorderSections,
  restoreSection,
  type RemovedSection,
  type SectionRow,
} from '@/lib/planning';

export default function GroupScreen() {
  const c = useC();
  const router = useRouter();
  const { profile } = useAuth();
  const { id, eventId, title } = useLocalSearchParams<{ id: string; eventId: string; title: string }>();
  const [sections, setSections] = useState<SectionRow[] | null>(null);
  const [removed, setRemoved] = useState<RemovedSection[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Staff + hosts (clients) manage sections; guests never do.
  const isStaff = profile?.accountType === 'staff';
  const canManage = isStaff || profile?.accountType === 'client';

  const load = useCallback(async () => {
    if (!eventId) return;
    const ov = await loadOverview(eventId);
    setSections(ov.groups.find((g) => g.id === id)?.sections ?? []);
    setRemoved(ov.removed);
  }, [eventId, id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const move = async (index: number, dir: -1 | 1) => {
    if (!sections) return;
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[index], next[j]] = [next[j], next[index]];
    setSections(next); // optimistic
    setBusy(true);
    const ok = await reorderSections(eventId, next.map((s) => s.id));
    setBusy(false);
    if (!ok) { Alert.alert('Could not reorder', 'Please try again.'); load(); }
  };

  const confirmDelete = (s: SectionRow) => {
    Alert.alert(
      isStaff ? 'Delete section?' : 'Remove section?',
      isStaff
        ? `Permanently delete "${s.title}"? This cannot be undone.`
        : `Remove "${s.title}" from your plan? You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isStaff ? 'Delete' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSections((prev) => (prev ?? []).filter((x) => x.id !== s.id)); // optimistic
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
    setRemoved((prev) => prev.filter((x) => x.id !== r.id)); // optimistic
    setBusy(true);
    const ok = await restoreSection(eventId, r.id);
    setBusy(false);
    if (!ok) Alert.alert('Could not restore', 'Please try again.');
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={{ color: Brand.purpleLight, fontSize: 16, fontWeight: '600' }}>‹</Text>
            <Text style={{ color: Brand.purpleLight, fontSize: 16 }}>Back</Text>
          </Pressable>
          {canManage && (sections?.length || removed.length) ? (
            <Pressable onPress={() => setEditing((e) => !e)} hitSlop={12} style={[styles.editBtn, { backgroundColor: editing ? Brand.purple : c.cardAlt }]}>
              <Text style={{ color: editing ? '#fff' : c.text, fontSize: 13, fontWeight: '700' }}>{editing ? 'Done' : 'Edit'}</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.md }}>
          <Text style={[styles.title, { color: c.text }]}>{title ?? 'Sections'}</Text>
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
              const subtitle = s.questionCount > 0
                ? (complete ? 'All answered' : `${s.answeredCount} of ${s.questionCount} answered`)
                : s.songCount > 0 ? `${s.songCount} song${s.songCount === 1 ? '' : 's'}` : 'Tap to open';

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
                    <View style={[styles.icon, { backgroundColor: c.cardAlt }]}><Text style={{ fontSize: 22 }}>{s.icon ?? '•'}</Text></View>
                  )}
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                    {s.questionCount > 0 && <Bar pct={pct} height={5} track={c.cardAlt} />}
                    <Text style={{ color: complete ? '#22c55e' : c.textTertiary, fontSize: 12, fontWeight: '600' }}>
                      {complete ? '✓ ' : ''}{subtitle}
                    </Text>
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingVertical: Space.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: Space.xs },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 40, height: 24, alignItems: 'center', justifyContent: 'center' },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  removedRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', paddingVertical: Space.sm, paddingHorizontal: Space.md },
  restoreBtn: { paddingHorizontal: 12, paddingVertical: 6 },
});
