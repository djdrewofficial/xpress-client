import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmojiIcon, Icon, MomentRow, NavBar, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Space, Type } from '@/lib/theme';

export type GroupMoment = {
  id: string;
  title: string;
  icon: string | null;
  meta: string;
  done: boolean;
};

export type RemovedMoment = { id: string; title: string; icon: string | null };

/** A chapter: the moments inside one group. Edit keeps reorder / remove / restore. */
export function GroupBody({
  title,
  chapterNumber,
  description,
  momentsDone,
  momentsTotal,
  questionsAnswered,
  questionsTotal,
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
  chapterNumber: number | null;
  description: string | null;
  momentsDone: number;
  momentsTotal: number;
  questionsAnswered: number;
  questionsTotal: number;
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
  const { t } = useT();
  const showEdit = canManage && (moments.length > 0 || removed.length > 0);
  const progressBits = [
    momentsTotal > 0 ? t('group.momentsProgress', { done: momentsDone, total: momentsTotal }) : null,
    questionsTotal > 0 ? t('group.answeredOf', { answered: questionsAnswered, total: questionsTotal }) : null,
  ].filter(Boolean);
  const progressPct = questionsTotal > 0 ? questionsAnswered / questionsTotal : momentsTotal > 0 ? momentsDone / momentsTotal : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
        <NavBar
          title=""
          onBack={onBack}
          trailing={showEdit ? { label: editing ? t('common.done') : t('common.edit'), onPress: onToggleEdit } : undefined}
        />
        <View style={styles.header}>
          {chapterNumber != null ? (
            <Text style={[Type.label, { color: c.red }]}>{t('group.chapter', { n: String(chapterNumber).padStart(2, '0') })}</Text>
          ) : null}
          <Text style={[styles.chapterTitle, { color: c.ink }]}>{title}</Text>
          {description ? <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>{description}</Text> : null}
          {progressBits.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={[Type.footnote, { color: c.ink2 }]}>{progressBits.join(' · ')}</Text>
              <View style={[styles.track, { backgroundColor: c.line }]}>
                <View style={[styles.fill, { backgroundColor: c.red, width: `${Math.max(0, Math.min(1, progressPct)) * 100}%` }]} />
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 10 }}>
        {editing ? (
          <Text style={[Type.footnote, { color: c.ink3 }]}>
            {t('group.reorderHint')} {busy ? t('common.saving') : ''}
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
                <Pressable onPress={() => onDelete(m.id)} disabled={busy} hitSlop={8} accessibilityLabel={t('group.removeA11y', { title: m.title })}>
                  <Icon name="trash" size={18} color={c.danger} />
                </Pressable>
              </View>
            ) : (
              <MomentRow
                key={m.id}
                title={m.title}
                showTime={false}
                meta={m.meta || undefined}
                badge={m.done ? 'done' : undefined}
                leading={
                  <View style={[styles.iconBox, { backgroundColor: c.accentTint }]}>
                    <EmojiIcon glyph={m.icon} size={20} color={c.accent} fallback="sparkles" />
                  </View>
                }
                onPress={() => onOpen(m.id)}
              />
            ),
          )
        )}
        {!loading && moments.length === 0 ? (
          <Text style={[Type.footnote, { color: c.ink3, paddingVertical: 8 }]}>{t('group.empty')}</Text>
        ) : null}
        {canManage && !editing ? (
          <Pressable onPress={onAdd} style={[styles.add, { borderColor: c.line }]}>
            <Icon name="plus" size={18} color={c.accent} />
            <Text style={[Type.subhead, { color: c.accent }]}>{t('group.add')}</Text>
          </Pressable>
        ) : null}
        {canManage && editing && removed.length > 0 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={[Type.label, { color: c.ink3 }]}>{t('group.removed')}</Text>
            {removed.map((r) => (
              <View key={r.id} style={[styles.removed, { borderColor: c.line, backgroundColor: c.surface2 }]}>
                <EmojiIcon glyph={r.icon} size={18} color={c.ink3} />
                <Text style={[Type.callout, { color: c.ink2, flex: 1 }]} numberOfLines={1}>
                  {r.title}
                </Text>
                <Pressable onPress={() => onRestore(r.id)} disabled={busy} hitSlop={8}>
                  <Text style={[Type.button, { color: c.accent }]}>{t('common.restore')}</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  chapterTitle: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  add: {
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
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
