import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

function parseTime(s: string | null): { hour: number; minute: number; pm: boolean } {
  const m = (s ?? '').match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (m) {
    const h = Math.min(12, Math.max(1, parseInt(m[1], 10)));
    const min = Math.min(55, Math.max(0, Math.round(parseInt(m[2], 10) / 5) * 5));
    return { hour: h, minute: min, pm: m[3].toLowerCase() === 'pm' };
  }
  return { hour: 5, minute: 0, pm: true };
}

export function format(hour: number, minute: number, pm: boolean): string {
  return `${hour}:${pad(minute)} ${pm ? 'PM' : 'AM'}`;
}

export function TimePickerSheet({ visible, initial, title, onClose, onSave }: {
  visible: boolean;
  initial: string | null;
  title?: string;
  onClose: () => void;
  onSave: (time: string | null) => void;
}) {
  const c = useC();
  const [hour, setHour] = useState(5);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const p = parseTime(initial);
    setHour(p.hour); setMinute(p.minute); setPm(p.pm);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl }} onPress={(e) => e.stopPropagation()}>
          <View style={styles.head}>
            <Pressable onPress={onClose}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></Pressable>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{title ?? 'Set time'}</Text>
            <Pressable onPress={() => onSave(format(hour, minute, pm))}><Text style={{ color: Brand.purple, fontWeight: '800', fontSize: 15 }}>Save</Text></Pressable>
          </View>

          <View style={{ padding: Space.lg, gap: Space.lg }}>
            <Text style={[styles.preview, { color: c.text }]}>{format(hour, minute, pm)}</Text>

            <Field label="HOUR" c={c}>
              {HOURS.map((h) => <Chip key={h} label={String(h)} active={h === hour} onPress={() => setHour(h)} />)}
            </Field>
            <Field label="MINUTE" c={c}>
              {MINUTES.map((m) => <Chip key={m} label={pad(m)} active={m === minute} onPress={() => setMinute(m)} />)}
            </Field>
            <View style={{ flexDirection: 'row', gap: Space.sm }}>
              <Chip label="AM" active={!pm} onPress={() => setPm(false)} grow />
              <Chip label="PM" active={pm} onPress={() => setPm(true)} grow />
            </View>

            <Pressable onPress={() => onSave(null)} style={[styles.clear, { borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Clear time</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({ label, c, children }: { label: string; c: ReturnType<typeof useC>; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: Space.lg }}>
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, grow }: { label: string; active: boolean; onPress: () => void; grow?: boolean }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        grow && { flex: 1, alignItems: 'center' },
        active ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { backgroundColor: c.cardAlt, borderColor: c.border },
      ]}>
      <Text style={{ color: active ? '#fff' : c.text, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingVertical: Space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.2)' },
  preview: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 16, minWidth: 46, alignItems: 'center' },
  clear: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
});
