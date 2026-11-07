import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, Sheet, useC } from '@/components/ui';
import { useEvent } from '@/lib/events';
import type { EventLite } from '@/lib/planning';
import { localeTag, useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Space, Type } from '@/lib/theme';

/** Bottom sheet to switch between the couple's events (tap the Home title). */
export function EventSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { events, eventId, selectEvent } = useEvent();
  return (
    <EventSwitchSheet
      visible={visible}
      events={events}
      eventId={eventId}
      onClose={onClose}
      onSelect={(e) => { selectEvent(e); onClose(); }}
    />
  );
}

export function EventSwitchSheet({
  visible,
  events,
  eventId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  events: EventLite[];
  eventId: string | null;
  onClose: () => void;
  onSelect: (event: EventLite) => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('home.events')}>
      <View style={{ gap: Space.sm }}>
        {events.map((e) => {
          const active = e.id === eventId;
          return (
            <Pressable
              key={e.id}
              onPress={() => onSelect(e)}
              style={[styles.row, { backgroundColor: active ? c.accentTint : c.surface2 }]}>
              <View style={styles.thumb}>
                <LinearGradient colors={[Brand.purple, Brand.purpleLight]} style={StyleSheet.absoluteFill} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.name, { color: c.ink }]}>{e.name || t('home.yourEventTitle')}</Text>
                <Text style={[Type.footnote, { color: c.ink3 }]}>{formatSwitchDate(e.event_date, locale, t('common.dateTbd'))}</Text>
              </View>
              {active ? <Icon name="check" size={18} color={c.accent} /> : <Icon name="chev-r" size={18} color={c.ink3} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Static list for screenshots — same rows, no modal. */
export function EventSwitchList({
  events,
  eventId,
  onSelect,
}: {
  events: EventLite[];
  eventId: string | null;
  onSelect?: (event: EventLite) => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  return (
    <View style={{ gap: Space.sm }}>
      <Text style={[Type.headline, { color: c.ink, marginBottom: 4 }]}>{t('home.events')}</Text>
      {events.map((e) => {
        const active = e.id === eventId;
        return (
          <Pressable key={e.id} onPress={() => onSelect?.(e)} style={[styles.row, { backgroundColor: active ? c.accentTint : c.surface2 }]}>
            <View style={styles.thumb}>
              <LinearGradient colors={[Brand.purple, Brand.purpleLight]} style={StyleSheet.absoluteFill} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.name, { color: c.ink }]}>{e.name || t('home.yourEventTitle')}</Text>
              <Text style={[Type.footnote, { color: c.ink3 }]}>{formatSwitchDate(e.event_date, locale, t('common.dateTbd'))}</Text>
            </View>
            {active ? <Icon name="check" size={18} color={c.accent} /> : <Icon name="chev-r" size={18} color={c.ink3} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function formatSwitchDate(d: string | null, locale: 'en' | 'es', fallback: string) {
  if (!d) return fallback;
  return new Date(d + 'T00:00:00').toLocaleDateString(localeTag(locale), { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, padding: Space.sm },
  thumb: { width: 52, height: 52, borderRadius: Radius.md, overflow: 'hidden' },
  name: { fontFamily: Fonts.semibold, fontSize: 15 },
});
