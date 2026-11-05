import { Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, EmojiIcon, Icon, useC, type IconName } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';

export const MOMENT_ICONS: IconName[] = ['cake', 'toast', 'sparkles', 'heart', 'disco', 'mic', 'music', 'rings', 'camera', 'party', 'star', 'first-dance'];

export type Suggestion = { id: string; title: string; icon: string | null };
export type MomentGroupOption = { id: string; title: string };

/** Suggested (template) + custom fields for a new moment. The sheet owns the save. */
export function NewMomentForm({
  suggestions,
  suggestionsLoading,
  selectedId,
  onSelectSuggestion,
  name,
  onName,
  icon,
  onIcon,
  groups,
  groupId,
  onGroup,
  timeLabel,
  onPickTime,
  notes,
  onNotes,
  onSubmit,
  busy,
  error,
}: {
  suggestions: Suggestion[];
  suggestionsLoading?: boolean;
  selectedId: string | null;
  onSelectSuggestion: (s: Suggestion) => void;
  name: string;
  onName: (v: string) => void;
  icon: IconName;
  onIcon: (name: IconName) => void;
  groups: MomentGroupOption[];
  groupId: string;
  onGroup: (id: string) => void;
  timeLabel: string | null;
  onPickTime: () => void;
  notes: string;
  onNotes: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={[Type.label, { color: c.red }]}>{t('newMoment.kicker')}</Text>
        <Text style={[styles.title, { color: c.ink }]}>{t('newMoment.title')}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t('newMoment.sub')}</Text>
      </View>

      <ScrollView style={{ maxHeight: Math.max(360, Dimensions.get('window').height - 250) }} contentContainerStyle={{ gap: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('newMoment.suggested')}</Text>
          {suggestionsLoading ? (
            <Text style={[Type.footnote, { color: c.ink3 }]}>{t('newMoment.loading')}</Text>
          ) : suggestions.length === 0 ? (
            <Text style={[Type.footnote, { color: c.ink3 }]}>{t('newMoment.none')}</Text>
          ) : (
            <View style={styles.chips}>
              {suggestions.map((s) => {
                const on = s.id === selectedId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onSelectSuggestion(s)}
                    style={[styles.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.line }]}>
                    <EmojiIcon glyph={s.icon} size={14} color={on ? c.onAccent : c.ink2} fallback="sparkles" />
                    <Text style={[Type.footnote, { color: on ? c.onAccent : c.ink, fontFamily: Fonts.semibold }]}>{s.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('newMoment.name')}</Text>
          <TextInput
            value={name}
            onChangeText={onName}
            placeholder={t('newMoment.namePh')}
            placeholderTextColor={c.ink3}
            style={StyleSheet.flatten([styles.input, { color: c.ink, borderColor: c.red, backgroundColor: c.surface }])}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('newMoment.icon')}</Text>
          <View style={styles.chips}>
            {MOMENT_ICONS.map((n) => {
              const on = n === icon;
              return (
                <Pressable
                  key={n}
                  onPress={() => onIcon(n)}
                  accessibilityLabel={n}
                  style={[styles.iconBtn, { backgroundColor: on ? c.accentTint : c.surface2, borderColor: on ? c.accent : 'transparent' }]}>
                  <Icon name={n} size={20} color={on ? c.accent : c.ink2} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {groups.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={[Type.label, { color: c.ink3 }]}>{t('newMoment.partOf')}</Text>
            <View style={styles.chips}>
              {groups.map((g) => {
                const on = g.id === groupId;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => onGroup(g.id)}
                    style={[styles.part, { backgroundColor: on ? c.surface : 'transparent' }, on && styles.partOn]}>
                    <Text style={[Type.subhead, { color: on ? c.ink : c.ink2 }]}>{g.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Pressable onPress={onPickTime} style={[styles.timeRow, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={[styles.iconBtn, { backgroundColor: c.accentTint, borderColor: 'transparent' }]}>
            <Icon name="clock" size={18} color={c.accent} />
          </View>
          <Text style={[Type.callout, { color: c.ink, flex: 1 }]}>{t('newMoment.time')}</Text>
          <Text style={[Type.callout, { color: timeLabel ? c.ink : c.ink3 }]}>{timeLabel ?? t('newMoment.setTime')}</Text>
          <Icon name="chev-r" size={18} color={c.ink3} />
        </Pressable>

        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('newMoment.note')}</Text>
          <TextInput
            value={notes}
            onChangeText={onNotes}
            placeholder={t('newMoment.notePh')}
            placeholderTextColor={c.ink3}
            style={StyleSheet.flatten([styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }])}
          />
        </View>

        {error ? <Text style={[Type.footnote, { color: c.danger }]}>{error}</Text> : null}
      </ScrollView>

      <Button label={busy ? t('newMoment.adding') : t('newMoment.add')} onPress={onSubmit} disabled={busy || !name.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: Fonts.body },
  iconBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  part: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  partOn: { shadowColor: '#1a1333', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: 10 },
});
