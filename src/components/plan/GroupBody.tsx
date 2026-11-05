import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmojiIcon, Icon, MomentRow, NavBar, useC } from '@/components/ui';
import { Fonts, Radius, Space, Type } from '@/lib/theme';

export type GroupMoment = {
  id: string;
  title: string;
  icon: string | null;
  time: string | null;
  meta: string;
  badge?: string;
};

export type RemovedMoment = { id: string; title: string; icon: string | null };

/** A chapter: the moments inside one group. Edit keeps reorder / remove / restore. */
export function GroupBody({
  title,
  subtitle,
  onBack,
  canManage,
  editing,
  onToggleEdit,
  moments,
  onOpen,
  onMove,
  onDelete,
  onAdd,
  removed,
  onRestore,
  loading,
  busy,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  canManage: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  moments: GroupMoment[];
  onOpen: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  removed: RemovedMoment[];
  onRestore: (id: string) => void;
  loading?: boolean;
  busy?: boolean;
}) {
  const c = useC();
  const showEdit = canManage && (moments.length > 0 || removed.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
        <NavBar
          large
          title={title}
          onBack={onBack}
          trailing={showEdit ? { label: editing ? 'Done' : 'Edit', onPress: onToggleEdit } : undefined}
        />
        <Text style={[Type.footnote, { color: c.ink2, paddingHorizontal: 20, marginBottom: 8 }]}>{subtitle}</Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 10 }}>
        {editing ? (
          <Text style={[Type.footnote, { color: c.ink3 }]}>
            Reorder with the arrows, or remove a moment. {busy ? 'Saving…' : ''}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
        ) : (
          moments.map((m, i) =>
            editing ? (
              <View key={m.id} style={[styles.editRow, { backgroundColor: c.surface, borderColor: c.line }]}>
                <View style={{ gap: 2 }}>
                  <Pressable onPress={() => onMove(i, -1)} disabled={i === 0 || busy} hitSlop={6} style={styles.arrow}>
                    <Icon name="chev-d" size={18} color={i === 0 ? c.ink3 : c.accent} style={{ transform: [{ rotate: '180deg' }] }} />
                  </Pressable>
                  <Pressable onPress={() => onMove(i, 1)} disabled={i === moments.length - 1 || busy} hitSlop={6} style={styles.arrow}>
                    <Icon name="chev-d" size={18} color={i === moments.length - 1 ? c.ink3 : c.accent} />
                  </Pressable>
                </View>
                <EmojiIcon glyph={m.icon} size={20} fallback="sparkles" />
                <Text style={[styles.editTitle, { color: c.ink, flex: 1 }]} numberOfLines={1}>
                  {m.title}
                </Text>
                <Pressable onPress={() => onDelete(m.id)} disabled={busy} hitSlop={8} accessibilityLabel={`Remove ${m.title}`}>
                  <Icon name="trash" size={18} color={c.danger} />
                </Pressable>
              </View>
            ) : (
              <MomentRow key={m.id} title={m.title} time={m.time} meta={m.meta} badge={m.badge} onPress={() => onOpen(m.id)} />
            ),
          )
        )}
        {!loading && moments.length === 0 ? (
          <Text style={[Type.footnote, { color: c.ink3, paddingVertical: 8 }]}>No moments in this chapter yet.</Text>
        ) : null}
        {canManage && !editing ? <Button label="Add a moment" variant="ghost" onPress={onAdd} /> : null}
        {canManage && editing && removed.length > 0 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={[Type.label, { color: c.ink3 }]}>Removed</Text>
            {removed.map((r) => (
              <View key={r.id} style={[styles.removed, { borderColor: c.line, backgroundColor: c.surface2 }]}>
                <EmojiIcon glyph={r.icon} size={18} color={c.ink3} />
                <Text style={[Type.callout, { color: c.ink2, flex: 1 }]} numberOfLines={1}>
                  {r.title}
                </Text>
                <Pressable onPress={() => onRestore(r.id)} disabled={busy} hitSlop={8}>
                  <Text style={[Type.button, { color: c.accent }]}>Restore</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  editRow: {
    minHeight: 70,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editTitle: { fontFamily: Fonts.semibold, fontSize: 16 },
  arrow: { width: 36, height: 22, alignItems: 'center', justifyContent: 'center' },
  removed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});

export function groupSubtitle(moments: number, status: string | null): string {
  const count = `${moments} ${moments === 1 ? 'moment' : 'moments'}`;
  return status ? `${count} · ${status}` : count;
}
