import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';
import { Icon } from './Icon';
import { useC } from './useC';

/**
 * P2/Track row.
 * - default: index, title, artist. Optional Must play tag (accent tint pill).
 * - with note: DJ note block under the track (`note` string).
 * - do not play: `ban` icon, muted crossed-out title.
 */
export function TrackRow({
  index,
  title,
  artist,
  mustPlay = false,
  doNotPlay = false,
  note,
  onPress,
}: {
  index?: number;
  title: string;
  artist?: string | null;
  mustPlay?: boolean;
  doNotPlay?: boolean;
  note?: string | null;
  onPress?: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const titleColor = doNotPlay ? c.ink3 : c.ink;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
      <View style={styles.row}>
        {doNotPlay ? (
          <Icon name="ban" size={20} color={c.danger} />
        ) : index != null ? (
          <Text style={[styles.index, { color: c.ink3 }]}>{index}</Text>
        ) : (
          <Icon name="music" size={20} color={c.ink3} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: titleColor, textDecorationLine: doNotPlay ? 'line-through' : 'none' }]}
            numberOfLines={1}>
            {title}
          </Text>
          {artist ? (
            <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
              {artist}
            </Text>
          ) : null}
        </View>
        {mustPlay && !doNotPlay ? (
          <View style={[styles.tag, { backgroundColor: c.accentTint }]}>
            <Text style={[Type.label, { color: c.accent, letterSpacing: 0.6 }]}>{t('row.mustPlay')}</Text>
          </View>
        ) : null}
      </View>
      {note ? (
        <View style={[styles.note, { backgroundColor: c.surface2 }]}>
          <Icon name="dj-note" size={16} color={c.accent} />
          <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]}>{note}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 68,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  index: { width: 22, fontFamily: Fonts.semibold, fontSize: 14, textAlign: 'center' },
  title: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
  tag: { height: 19, borderRadius: Radius.pill, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.md, padding: 10 },
});
