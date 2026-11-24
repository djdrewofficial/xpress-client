import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordVinyl } from '@/components/music/MusicRecord';
import { FocusedStatusBar, Icon, ListCell, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  playlistMusicStats,
  playlistRowSubtitle,
  type EventPlaylist,
} from '@/lib/playlists';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/**
 * Music tab when the event has playlist moments.
 * Shows a compact hero (totals + must / do-not-play), then one row per playlist.
 * Song ideas / Music to avoid stay in `afterHero` (MusicContentSafety).
 */
export function PlaylistsHome({
  playlists,
  loading = false,
  bottomPad = 120,
  onOpenPlaylist,
  onAddMusic,
  onImport,
  onSearch,
  onSwitchEvent,
  afterHero,
  onScrollBeginDrag,
}: {
  playlists: EventPlaylist[];
  loading?: boolean;
  bottomPad?: number;
  onOpenPlaylist: (playlist: EventPlaylist) => void;
  onAddMusic: () => void;
  onImport: () => void;
  onSearch: () => void;
  onSwitchEvent?: () => void;
  afterHero?: ReactNode;
  onScrollBeginDrag?: () => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  const insets = useSafeAreaInsets();
  const stats = playlistMusicStats(playlists);

  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: c.bg }}>
      <FocusedStatusBar />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.overline, { color: c.red }]}>{t('playlists.eyebrow')}</Text>
          <Pressable
            onPress={onSwitchEvent}
            disabled={!onSwitchEvent}
            style={styles.titleRow}
            accessibilityRole={onSwitchEvent ? 'button' : undefined}
            accessibilityLabel={onSwitchEvent ? t('home.switchEvent') : undefined}>
            <Text style={[Type.largeTitle, { color: c.ink }]}>{t('playlists.title')}</Text>
            {onSwitchEvent ? <Icon name="chev-d" size={16} color={c.ink3} /> : null}
          </Pressable>
        </View>
        <Pressable
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel={t('playlists.searchA11y')}
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
          <Text style={styles.sideEyebrow}>{t('playlists.heading').toUpperCase()}</Text>
          <View style={styles.countRow}>
            <Text style={styles.count}>{loading ? '—' : stats.songs}</Text>
            <Text style={styles.countWord}>{t('playlists.songsWord')}</Text>
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
            <Stat value={loading ? '—' : String(stats.playlists)} label={t('playlists.heading')} />
            <Stat value={loading ? '—' : String(stats.mustPlay)} label={t('playlists.mustPlay')} />
            <Stat value={loading ? '—' : String(stats.doNotPlay)} label={t('playlists.doNotPlay')} tone="red" />
          </View>
        </LinearGradient>

        {afterHero}

        {playlists.length === 0 && !loading ? (
          <View style={[styles.empty, { backgroundColor: c.surface }]}>
            <Icon name="vinyl" size={28} color={c.ink3} />
            <Text style={[Type.headline, { color: c.ink, textAlign: 'center' }]}>{t('playlists.emptyTitle')}</Text>
            <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>{t('playlists.emptyBody')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={[Type.label, { color: c.ink3, marginTop: 4 }]}>{t('playlists.heading')}</Text>
            {playlists.map((playlist) => (
              <ListCell
                key={playlist.sectionId}
                icon="music"
                title={playlist.title}
                subtitle={playlistRowSubtitle(playlist, locale)}
                onPress={() => onOpenPlaylist(playlist)}
              />
            ))}
          </View>
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
  statLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  empty: { borderRadius: Radius.lg, padding: 22, alignItems: 'center', gap: 8 },
});
