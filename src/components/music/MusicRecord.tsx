import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusedStatusBar, Icon, TrackRow, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import {
  momentCountLabel,
  momentSongCount,
  momentSubtitle,
  musicStats,
  type MusicMoment,
} from '@/components/music/model';

export function RecordVinyl({ size = 168 }: { size?: number }) {
  const rings = [0.92, 0.78, 0.64, 0.5];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#140c22', alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((scale) => (
        <View
          key={scale}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * scale,
            height: size * scale,
            borderRadius: size,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
          }}
        />
      ))}
      <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: '#fe3a3b', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.07, height: size * 0.07, borderRadius: size, backgroundColor: '#2a1024' }} />
      </View>
    </View>
  );
}

export function MusicRecord({
  moments,
  loading = false,
  bottomPad = 120,
  onOpenMoment,
  onAddToMoment,
  onAddMusic,
  onImport,
  onSearch,
  onSwitchEvent,
  afterHero,
  onScrollBeginDrag,
}: {
  moments: MusicMoment[];
  loading?: boolean;
  bottomPad?: number;
  onOpenMoment: (moment: MusicMoment) => void;
  onAddToMoment: (moment: MusicMoment) => void;
  onAddMusic: () => void;
  onImport: () => void;
  onSearch: () => void;
  onSwitchEvent?: () => void;
  /** Song ideas / Music to avoid moderation cards. */
  afterHero?: ReactNode;
  onScrollBeginDrag?: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const stats = musicStats(moments);
  const sideA = moments.filter((m) => m.side === 'A');
  const sideB = moments.filter((m) => m.side === 'B');

  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: c.bg }}>
      <FocusedStatusBar />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.overline, { color: c.red }]}>{t('record.eyebrow')}</Text>
          <Pressable
            onPress={onSwitchEvent}
            disabled={!onSwitchEvent}
            style={styles.titleRow}
            accessibilityRole={onSwitchEvent ? 'button' : undefined}
            accessibilityLabel={onSwitchEvent ? t('home.switchEvent') : undefined}>
            <Text style={[Type.largeTitle, { color: c.ink }]}>{t('record.title')}</Text>
            {onSwitchEvent ? <Icon name="chev-d" size={16} color={c.ink3} /> : null}
          </Pressable>
        </View>
        <Pressable
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel={t('record.searchA11y')}
          style={[styles.search, { backgroundColor: c.surface }, Shadow.card]}>
          <Icon name="search" size={20} color={c.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad, gap: 14 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}>
        <LinearGradient colors={['#241447', '#3d2278', '#5a2d88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.vinyl} pointerEvents="none">
            <RecordVinyl />
          </View>
          <Text style={styles.sideEyebrow}>{t('record.sideBoth')}</Text>
          <View style={styles.countRow}>
            <Text style={styles.count}>{loading ? '—' : stats.songs}</Text>
            <Text style={styles.countWord}>{t('record.songsWord')}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onAddMusic} style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.92 : 1 }]} accessibilityRole="button">
              <Icon name="plus" size={16} color="#fff" />
              <Text style={styles.addLabel}>{t('record.addMusic')}</Text>
            </Pressable>
            <Pressable onPress={onImport} style={({ pressed }) => [styles.importBtn, { opacity: pressed ? 0.92 : 1 }]} accessibilityRole="button">
              <Icon name="import" size={16} color="#fff" />
              <Text style={styles.importLabel}>{t('record.import')}</Text>
            </Pressable>
          </View>
          <View style={styles.rule} />
          <View style={styles.stats}>
            <Stat value={loading ? '—' : String(stats.moments)} label={t('record.moments')} />
            <Stat value={loading ? '—' : String(stats.mustPlay)} label={t('record.mustPlay')} />
            <Stat value={loading ? '—' : String(stats.doNotPlay)} label={t('record.doNotPlay')} tone="red" />
          </View>
        </LinearGradient>

        {afterHero}

        {moments.length === 0 && !loading ? (
          <View style={[styles.empty, { backgroundColor: c.surface }]}>
            <Icon name="vinyl" size={28} color={c.ink3} />
            <Text style={[Type.headline, { color: c.ink, textAlign: 'center' }]}>{t('record.emptyTitle')}</Text>
            <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>
              {t('record.emptyBody')}
            </Text>
          </View>
        ) : (
          <>
            <Side label={t('record.sideA')} moments={sideA} onOpen={onOpenMoment} onAdd={onAddToMoment} />
            <Side label={t('record.sideB')} moments={sideB} onOpen={onOpenMoment} onAdd={onAddToMoment} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'red' }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tone === 'red' ? '#fe3a3b' : '#fff' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Side({
  label,
  moments,
  onOpen,
  onAdd,
}: {
  label: string;
  moments: MusicMoment[];
  onOpen: (moment: MusicMoment) => void;
  onAdd: (moment: MusicMoment) => void;
}) {
  const c = useC();
  if (moments.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={[Type.label, { color: c.ink3, marginTop: 4 }]}>{label}</Text>
      {moments.map((moment) => (
        <MomentBlock key={moment.id} moment={moment} onOpen={() => onOpen(moment)} onAdd={() => onAdd(moment)} />
      ))}
    </View>
  );
}

function MomentBlock({ moment, onOpen, onAdd }: { moment: MusicMoment; onOpen: () => void; onAdd: () => void }) {
  const c = useC();
  const { t, locale } = useT();
  const empty = momentSongCount(moment) === 0;
  const real = moment.id !== 'do-not-play';
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.moment, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Pressable
          onPress={real ? onOpen : undefined}
          style={({ pressed }) => [styles.momentMain, { backgroundColor: pressed && real ? c.surface2 : 'transparent' }]}
          accessibilityRole={real ? 'button' : undefined}>
          <Text style={[styles.index, { color: c.red }]}>
            {moment.side}
            {moment.index}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.momentTitle, { color: c.ink }]} numberOfLines={1}>
              {moment.title}
            </Text>
            <Text style={[Type.footnote, { color: empty ? c.ink3 : c.ink2 }]} numberOfLines={1}>
              {momentSubtitle(moment, locale)}
            </Text>
          </View>
          {empty ? null : <Text style={[Type.footnote, { color: c.ink3 }]}>{momentCountLabel(moment, locale)}</Text>}
        </Pressable>
        {empty ? (
          <Pressable onPress={onAdd} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('record.addSongA11y', { title: moment.title })}>
            <Text style={[styles.addLink, { color: c.red }]}>{t('record.add')}</Text>
          </Pressable>
        ) : null}
      </View>

      {moment.tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          index={i + 1}
          title={track.title}
          artist={track.artist}
          mustPlay={track.mustPlay}
          note={track.note}
          onPress={real ? onOpen : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  search: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  card: { borderRadius: Radius.lg, padding: 18, overflow: 'hidden', minHeight: 228 },
  vinyl: { position: 'absolute', right: -36, top: -8 },
  sideEyebrow: { color: 'rgba(255,255,255,0.78)', fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.4 },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  count: { color: '#fff', fontFamily: Fonts.display, fontSize: 48, lineHeight: 52 },
  countWord: { color: '#fff', fontFamily: Fonts.displayItalic, fontSize: 22, lineHeight: 32, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingRight: 72 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fe3a3b',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  addLabel: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  importLabel: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 16 },
  stats: { flexDirection: 'row', marginTop: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 22 },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  empty: { borderRadius: Radius.lg, padding: 22, alignItems: 'center', gap: 8 },
  moment: {
    minHeight: 70,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  index: { width: 36, fontFamily: Fonts.bold, fontSize: 16 },
  momentTitle: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
  addLink: { fontFamily: Fonts.bold, fontSize: 15 },
});
