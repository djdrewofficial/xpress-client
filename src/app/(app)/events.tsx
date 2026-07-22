import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { Backdrop } from '@/components/Backdrop';
import { AppHeader } from '@/components/AppHeader';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth, staffSeesAllEvents } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { getStaffEvents, type StaffEvent } from '@/lib/planning';

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
const fmtTime = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function StaffEventsScreen() {
  const c = useC();
  const router = useRouter();
  const { profile } = useAuth();
  const { selectEvent } = useEvent();
  const [events, setEvents] = useState<StaffEvent[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    const rows = await getStaffEvents({ employeeId: profile.employeeId, seesAll: staffSeesAllEvents(profile) });
    setEvents(rows);
  }, [profile]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const list = events ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((e) =>
      [e.name, e.clientName, e.status?.name, fmtDate(e.event_date)]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(needle)),
    );
  }, [events, q]);

  const open = useCallback(
    (e: StaffEvent) => {
      selectEvent({ id: e.id, name: e.name, event_date: e.event_date, cover_photo_url: e.cover_photo_url });
      router.push('/(tabs)/(plan)');
    },
    [selectEvent, router],
  );

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <AppHeader
        title="Events"
        switchable={false}
        subtitle={events ? `${events.length} upcoming` : undefined}
      />

      <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.md }}>
        <Text style={[styles.h1, { color: c.text }]}>Events</Text>
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.textTertiary, fontSize: 16 }}>⌕</Text>
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Search name, client, or date"
            placeholderTextColor={c.textTertiary}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {!events ? (
        <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xxl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: Space.lg, gap: Space.md, paddingBottom: Space.xxl * 3 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: Space.xl }}>
              {q ? `No events match “${q}”.` : 'No upcoming events assigned to you yet.'}
            </Text>
          }
          renderItem={({ item }) => <EventCard event={item} onPress={() => open(item)} c={c} />}
        />
      )}
    </View>
  );
}

function EventCard({ event, onPress, c }: { event: StaffEvent; onPress: () => void; c: ReturnType<typeof useC> }) {
  const time = fmtTime(event.start_time);
  const statusColor = event.status?.color || Brand.purple;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.banner}>
          {event.cover_photo_url ? (
            <Image source={{ uri: event.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          {event.status ? (
            <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
              <Text style={[styles.statusTxt, { color: event.status.textColor || '#fff' }]} numberOfLines={1}>
                {event.status.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: Space.md, gap: 3 }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{event.name || 'Untitled event'}</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>
            📅 {fmtDate(event.event_date)}{time ? `  ·  ${time}` : ''}
          </Text>
          {event.clientName ? <Text style={{ color: c.textTertiary, fontSize: 13 }} numberOfLines={1}>👤 {event.clientName}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontFamily: Fonts.display, marginBottom: Space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.pill, paddingHorizontal: Space.md, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, letterSpacing: 0, padding: 0 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  banner: { height: 120, backgroundColor: Brand.purple },
  statusPill: { position: 'absolute', top: Space.sm, left: Space.sm, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  statusTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});
