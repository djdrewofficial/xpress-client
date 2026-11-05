import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, SegmentedControl, useC, type IconName } from '@/components/ui';
import { Brand, Fonts, Radius, Shadow, Type } from '@/lib/theme';
import type { StaffMonthGroup, StaffRowModel } from '@/components/eventDisplay';

export function StaffEventsView({
  loading,
  eyebrow,
  initials,
  query,
  onQuery,
  segment,
  onSegment,
  upcomingCount,
  groups,
  empty,
  emptyTitle,
  emptyBody,
  onOpen,
}: {
  loading: boolean;
  eyebrow: string;
  initials: string;
  query: string;
  onQuery: (value: string) => void;
  segment: 'upcoming' | 'past';
  onSegment: (value: 'upcoming' | 'past') => void;
  upcomingCount: number;
  groups: StaffMonthGroup[];
  empty: 'events' | 'matches' | null;
  emptyTitle: string;
  emptyBody: string;
  onOpen: (id: string) => void;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
          gap: 18,
        }}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Type.overline, styles.eyebrow, { color: c.red }]} numberOfLines={1}>
              {eyebrow}
            </Text>
            <Text style={[Type.largeTitle, { color: c.ink }]}>Events</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: Brand.purple }]}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>Search</Text>
          <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="search" size={18} color={c.ink3} />
            <TextInput
              style={[styles.searchInput, { color: c.ink }]}
              placeholder="Search couples or venues"
              placeholderTextColor={c.ink3}
              value={query}
              onChangeText={onQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => onQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Icon name="close" size={16} color={c.ink3} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <SegmentedControl
          options={[
            { value: 'upcoming', label: loading ? 'Upcoming' : `Upcoming ${upcomingCount}` },
            { value: 'past', label: 'Past' },
          ]}
          value={segment}
          onChange={onSegment}
        />

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 36 }} />
        ) : empty ? (
          <EmptyState icon={empty === 'matches' ? 'search' : 'calendar'} title={emptyTitle} body={emptyBody} />
        ) : (
          groups.map((group) => (
            <View key={group.title} style={{ gap: 8 }}>
              <Text style={[Type.overline, { color: c.ink3, letterSpacing: 1.6 }]}>{group.title}</Text>
              <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
                {group.rows.map((row, index) => (
                  <View key={row.id}>
                    {index > 0 ? <View style={[styles.div, { backgroundColor: c.line }]} /> : null}
                    <EventRow row={row} onPress={() => onOpen(row.id)} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function EventRow({ row, onPress }: { row: StaffRowModel; onPress: () => void }) {
  const c = useC();
  const tone = statusTone(row, c);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: c.surface2 } : null]}>
      <View style={styles.date}>
        <Text style={[styles.month, { color: c.red }]}>{row.month}</Text>
        <Text style={[styles.day, { color: c.ink }]}>{row.day}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleLine}>
          <Text style={[styles.title, { color: c.ink, flex: 1 }]} numberOfLines={1}>
            {row.title}
          </Text>
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.pillTxt, { color: tone.fg }]} numberOfLines={1}>
              {row.status}
            </Text>
          </View>
        </View>
        {row.subtitle ? (
          <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function statusTone(row: StaffRowModel, c: ReturnType<typeof useC>): { bg: string; fg: string } {
  if (row.tone === 'ready') return { bg: c.success + '22', fg: c.success };
  if (row.tone === 'progress') return { bg: c.accentTint, fg: c.accent };
  if (row.tone === 'idle') return { bg: c.surface2, fg: c.ink2 };
  if (row.statusColor && row.statusTextColor) return { bg: row.statusColor, fg: row.statusTextColor };
  return { bg: c.accentTint, fg: c.accent };
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const c = useC();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentTint }]}>
        <Icon name={icon} size={22} color={c.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.ink }]}>{title}</Text>
      <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  eyebrow: { letterSpacing: 1.4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarTxt: { color: '#ffffff', fontFamily: Fonts.bold, fontSize: 15 },
  search: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 16, letterSpacing: 0, padding: 0, fontFamily: Fonts.body },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  div: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { width: 44, alignItems: 'center' },
  month: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 0.6 },
  day: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 28 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 20 },
  pill: { maxWidth: 124, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  pillTxt: { fontFamily: Fonts.semibold, fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 36, paddingHorizontal: 16 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: 16, textAlign: 'center' },
});
