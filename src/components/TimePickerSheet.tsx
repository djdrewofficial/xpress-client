import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button, Icon, Sheet, useC, useScheme } from '@/components/ui';
import { localeTag, useT } from '@/lib/i18n';
import { Fonts, Type } from '@/lib/theme';

const ROW = 36;

/**
 * Small sheet for a moment's time.
 * iOS shows the native UIDatePicker wheel (`display="spinner"`).
 * Android's community picker opens a second dialog instead of an inline wheel,
 * and web has no native wheel, so those platforms get the same sheet with a
 * tappable wheel that writes the same "h:mm AM/PM" label.
 */
export function TimePickerSheet({
  visible,
  initial,
  title,
  subtitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSave: (time: string | null) => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  const scheme = useScheme();
  const [date, setDate] = useState(() => dateFromLabel(initial));

  useEffect(() => {
    if (visible) setDate(dateFromLabel(initial));
  }, [visible, initial]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.title, { color: c.ink }]}>{title ?? t('time.title')}</Text>
          {subtitle ? <Text style={[Type.footnote, { color: c.ink2, marginTop: 2 }]}>{subtitle}</Text> : null}
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={22} color={c.ink3} />
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          mode="time"
          display="spinner"
          locale={localeTag(locale)}
          value={date}
          minuteInterval={5}
          themeVariant={scheme}
          textColor={c.ink}
          onChange={(_event, next) => {
            if (next) setDate(next);
          }}
          style={{ height: 216 }}
        />
      ) : (
        <TimeWheel date={date} onChange={setDate} />
      )}

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label={t('time.clear')} variant="ghost" onPress={() => onSave(null)} style={{ borderColor: c.accent }} />
        </View>
        <View style={{ flex: 1.35 }}>
          <Button label={t('time.save')} onPress={() => onSave(formatClock(date))} />
        </View>
      </View>
    </Sheet>
  );
}

export function formatClock(d: Date): string {
  const { hour, minute, pm } = parts(d);
  return `${hour}:${String(minute).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
}

function dateFromLabel(s: string | null): Date {
  const d = new Date();
  const m = (s ?? '').match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) {
    d.setHours(17, 30, 0, 0);
    return d;
  }
  return apply(d, parseInt(m[1], 10), parseInt(m[2], 10), m[3].toLowerCase() === 'pm');
}

function parts(d: Date): { hour: number; minute: number; pm: boolean } {
  const pm = d.getHours() >= 12;
  let hour = d.getHours() % 12;
  if (hour === 0) hour = 12;
  const minute = ((Math.round(d.getMinutes() / 5) * 5) % 60 + 60) % 60;
  return { hour, minute, pm };
}

function apply(base: Date, hour: number, minute: number, pm: boolean): Date {
  const d = new Date(base);
  let h = hour % 12;
  if (pm) h += 12;
  const snapped = ((Math.round(minute / 5) * 5) % 60 + 60) % 60;
  d.setHours(h, snapped, 0, 0);
  return d;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** Five-row wheel. The center row is selected; tapping another row moves it there. */
function TimeWheel({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const c = useC();
  const { t } = useT();
  const { hour, minute, pm } = parts(date);
  const minuteLabel = String(minute).padStart(2, '0');
  const am = t('time.am');
  const pmLabel = t('time.pm');

  const setHour = (label: string) => onChange(apply(date, parseInt(label, 10), minute, pm));
  const setMinute = (label: string) => onChange(apply(date, hour, parseInt(label, 10), pm));
  const setPeriod = (label: string) => onChange(apply(date, hour, minute, label === pmLabel));

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={[styles.selection, { backgroundColor: c.surface2 }]} />
      <View style={styles.cols}>
        <WheelColumn items={HOURS} selected={String(hour)} onSelect={setHour} />
        <WheelColumn items={MINUTES} selected={minuteLabel} onSelect={setMinute} />
        <WheelColumn items={[am, pmLabel]} selected={pm ? pmLabel : am} onSelect={setPeriod} />
      </View>
    </View>
  );
}

function WheelColumn({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (label: string) => void }) {
  const c = useC();
  const index = Math.max(0, items.indexOf(selected));
  const rows = [-2, -1, 0, 1, 2].map((offset) => {
    const label = items[index + offset];
    return { offset, label: label ?? '' };
  });
  return (
    <View style={styles.col}>
      {rows.map((row) =>
        row.label ? (
          <Pressable key={row.offset} onPress={() => onSelect(row.label)} style={styles.cell} accessibilityRole="button">
            <Text
              style={{
                fontFamily: row.offset === 0 ? Fonts.bold : Fonts.medium,
                fontSize: row.offset === 0 ? 22 : 18,
                color: row.offset === 0 ? c.ink : c.ink3,
              }}>
              {row.label}
            </Text>
          </Pressable>
        ) : (
          <View key={row.offset} style={styles.cell} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  wheel: { height: ROW * 5, justifyContent: 'center', marginVertical: 8 },
  selection: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: 12 },
  cols: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  col: { width: 72, alignItems: 'center' },
  cell: { height: ROW, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
