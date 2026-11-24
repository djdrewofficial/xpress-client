import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReorderableList, {
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';

import { SongArtPlay, useSongPreviewPlayer } from '@/components/music/SongArtPlay';
import { Button, ContentColumn, FocusedStatusBar, Icon, NavBar, PlayPauseIcon, Sheet, TrackRow, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  applySongReorder,
  playlistAtLimit,
  type EventPlaylist,
  type PlaylistSong,
} from '@/lib/playlists';
import { Fonts, Radius, Type } from '@/lib/theme';

/**
 * One playlist's songs: add, remove, and (for hosts) reorder.
 * Presentational — the route owns load / mutation / AddMusicSheet.
 */
export function PlaylistDetail({
  playlist,
  canManage,
  userId = null,
  reordering,
  onToggleReorder,
  onBack,
  onAdd,
  onRemove,
  onReorder,
  onToggleMust,
}: {
  playlist: EventPlaylist;
  canManage: boolean;
  /** Signed-in user — guests may remove only songs they requested. */
  userId?: string | null;
  reordering: boolean;
  onToggleReorder: () => void;
  onBack: () => void;
  onAdd: () => void;
  onRemove: (song: PlaylistSong) => void;
  onReorder: (orderedIds: string[]) => void;
  onToggleMust?: (song: PlaylistSong) => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const preview = useSongPreviewPlayer();
  const atLimit = playlistAtLimit(playlist);
  const [menu, setMenu] = useState<PlaylistSong | null>(null);

  const data = useMemo(
    () => [...playlist.songs].sort((a, b) => a.sortOrder - b.sortOrder),
    [playlist.songs],
  );

  const onDragReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const next = applySongReorder(data, from, to);
      onReorder(next.map((s) => s.id));
    },
    [data, onReorder],
  );

  const limitBanner =
    playlist.songLimit != null ? (
      <View style={[styles.banner, { backgroundColor: atLimit ? c.redTint : c.surface2 }]}>
        <Text style={[Type.footnote, { color: atLimit ? c.red : c.ink2 }]}>
          {atLimit
            ? t('playlists.atLimit', { limit: playlist.songLimit })
            : t('playlists.limitLabel', { limit: playlist.songLimit })}
        </Text>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FocusedStatusBar />
      <View style={{ paddingTop: insets.top, backgroundColor: c.bg }}>
        <ContentColumn>
          <NavBar
            title={playlist.title}
            onBack={onBack}
            trailing={
              canManage && data.length > 1
                ? {
                    label: reordering ? t('playlists.reorderDone') : t('playlists.reorder'),
                    onPress: onToggleReorder,
                  }
                : undefined
            }
          />
        </ContentColumn>
      </View>

      <ContentColumn fill>
        {limitBanner ? <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>{limitBanner}</View> : null}

        {data.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: c.surface }]}>
            <Icon name="music" size={28} color={c.ink3} />
            <Text style={[Type.headline, { color: c.ink, textAlign: 'center' }]}>{t('playlists.noSongsYet')}</Text>
            <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>{t('playlists.emptyDetail')}</Text>
            {!atLimit ? (
              <Button label={t('playlists.addSong')} onPress={onAdd} />
            ) : null}
          </View>
        ) : reordering && canManage ? (
          <ReorderableList
            data={data}
            keyExtractor={(item) => item.id}
            onReorder={onDragReorder}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10 }}
            renderItem={({ item, index }) => (
              <DragSongRow
                song={item}
                index={index}
                playingId={preview.playingId}
                onTogglePlay={preview.togglePlay}
              />
            )}
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10 }}
            ListFooterComponent={
              !atLimit ? (
                <Pressable
                  onPress={onAdd}
                  style={({ pressed }) => [
                    styles.addRow,
                    { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('playlists.addSongA11y', { title: playlist.title })}>
                  <Icon name="plus" size={18} color={c.red} />
                  <Text style={[Type.button, { color: c.red }]}>{t('playlists.addSong')}</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item, index }) => (
              <TrackRow
                index={index + 1}
                title={item.title}
                artist={item.artist}
                mustPlay={item.mustPlay}
                doNotPlay={item.doNotPlay}
                note={item.note}
                onPress={() => setMenu(item)}
                leading={
                  <SongArtPlay
                    title={item.title}
                    artworkUrl={null}
                    playing={preview.playingId === item.id}
                    onPress={() =>
                      preview.togglePlay({
                        id: item.id,
                        title: item.title,
                        artist: item.artist,
                        previewUrl: null,
                      })
                    }
                  />
                }
              />
            )}
          />
        )}
      </ContentColumn>

      <Sheet visible={menu != null} onClose={() => setMenu(null)} title={menu?.title}>
        {menu ? (
          <View style={{ gap: 10 }}>
            {menu.artist ? (
              <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>{menu.artist}</Text>
            ) : null}
            {canManage && onToggleMust && !menu.doNotPlay ? (
              <Button
                label={menu.mustPlay ? t('moment.removeMust') : t('moment.markMust')}
                variant="secondary"
                onPress={() => {
                  const song = menu;
                  setMenu(null);
                  onToggleMust(song);
                }}
              />
            ) : null}
            {canManage || (userId != null && menu.requestedBy === userId) ? (
              <Pressable
                onPress={() => {
                  const song = menu;
                  setMenu(null);
                  Alert.alert(t('moment.removeSong'), undefined, [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.remove'), style: 'destructive', onPress: () => onRemove(song) },
                  ]);
                }}
                style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={[Type.button, { color: c.danger }]}>{t('moment.removeSong')}</Text>
              </Pressable>
            ) : null}
            <Button label={t('common.close')} variant="ghost" onPress={() => setMenu(null)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function DragSongRow({
  song,
  index,
  playingId,
  onTogglePlay,
}: {
  song: PlaylistSong;
  index: number;
  playingId: string | null;
  onTogglePlay: (track: {
    id: string;
    title: string;
    artist?: string | null;
    previewUrl?: string | null;
  }) => void;
}) {
  const c = useC();
  const { t } = useT();
  const drag = useReorderableDrag();
  return (
    <Pressable
      onLongPress={drag}
      delayLongPress={160}
      style={[styles.dragRow, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.index, { color: c.ink3 }]}>{index + 1}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {song.title}
        </Text>
        {song.artist ? (
          <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
            {song.artist}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => onTogglePlay({ id: song.id, title: song.title, artist: song.artist, previewUrl: null })}
        hitSlop={8}
        accessibilityRole="button">
        <PlayPauseIcon playing={playingId === song.id} size={18} color={c.ink2} />
      </Pressable>
      <Pressable onLongPress={drag} delayLongPress={120} hitSlop={8} accessibilityLabel={t('row.drag')}>
        <Icon name="drag" size={18} color={c.ink3} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  empty: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: Radius.lg,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  addRow: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dragRow: {
    minHeight: 68,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  index: { width: 22, fontFamily: Fonts.semibold, fontSize: 14, textAlign: 'center' },
  title: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
});
