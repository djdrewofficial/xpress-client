import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useC } from '@/components/ui';
import { useEvent } from '@/lib/events';
import { Brand, Fonts, Radius, Space } from '@/lib/theme';

const fmt = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';

/** Bottom sheet to switch between the couple's events (tap the header title). */
export function EventSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { events, eventId, selectEvent } = useEvent();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + Space.lg }]} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={[styles.title, { color: c.text }]}>Your events</Text>
          {events.map((e) => {
            const active = e.id === eventId;
            return (
              <Pressable
                key={e.id}
                onPress={() => {
                  selectEvent(e);
                  onClose();
                }}
                style={[styles.row, { borderColor: active ? Brand.purple : c.border, backgroundColor: active ? Brand.purple + '12' : c.card }]}>
                <View style={styles.thumb}>
                  {e.cover_photo_url ? (
                    <Image source={{ uri: e.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <LinearGradient colors={[Brand.purple, Brand.purpleLight]} style={StyleSheet.absoluteFill} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{e.name || 'Your Event'}</Text>
                  <Text style={{ color: c.textTertiary, fontSize: 12 }}>{fmt(e.event_date)}</Text>
                </View>
                {active ? <Text style={{ color: Brand.purple, fontSize: 18, fontWeight: '800' }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Space.lg, paddingTop: Space.md, gap: Space.sm },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', marginBottom: Space.sm },
  title: { fontSize: 22, fontFamily: Fonts.display, marginBottom: Space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderRadius: Radius.lg, padding: Space.sm },
  thumb: { width: 52, height: 52, borderRadius: Radius.md, overflow: 'hidden' },
});
