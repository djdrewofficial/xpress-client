import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useAddMusic } from '@/components/music/AddMusicSheet';
import { PlaylistDetail } from '@/components/music/PlaylistDetail';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { useT } from '@/lib/i18n';
import { managesEvent } from '@/lib/membership';
import {
  loadPlaylists,
  playlistAtLimit,
  removePlaylistSong,
  reorderPlaylistSongs,
  type EventPlaylist,
  type PlaylistSong,
} from '@/lib/playlists';
import { setMustPlay } from '@/lib/planning';

/**
 * Playlist detail — opened from the Music tab.
 * Add via the shared AddMusicSheet; remove / reorder via /api/mobile/planning/songs.
 */
export default function PlaylistScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const { profile, session } = useAuth();
  const { event, eventId: selectedEventId } = useEvent();
  const params = useLocalSearchParams<{ sectionId: string; eventId?: string }>();
  const sectionId = Array.isArray(params.sectionId) ? params.sectionId[0] : params.sectionId;
  const eventId = (Array.isArray(params.eventId) ? params.eventId[0] : params.eventId) || selectedEventId || '';

  const [playlist, setPlaylist] = useState<EventPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const canManage = managesEvent(event, profile?.accountType);
  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    if (!eventId || !sectionId) {
      setPlaylist(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await loadPlaylists(eventId);
    setPlaylist(list.find((p) => p.sectionId === sectionId) ?? null);
    setLoading(false);
  }, [eventId, sectionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const music = useAddMusic({
    eventId,
    sections: playlist ? [{ id: playlist.sectionId, title: playlist.title }] : [],
    onAdded: () => {
      void load();
    },
    onReload: () => {
      void load();
    },
  });

  const onRemove = async (song: PlaylistSong) => {
    if (!eventId || !playlist) return;
    const mine = userId != null && song.requestedBy === userId;
    if (!canManage && !mine) return;
    const prev = playlist;
    setPlaylist({ ...playlist, songs: playlist.songs.filter((s) => s.id !== song.id) });
    const result = await removePlaylistSong(eventId, song.id);
    if (!result.ok) {
      setPlaylist(prev);
      Alert.alert(t('playlists.removeFail'), t('common.tryAgain'));
    }
  };

  const onReorder = async (orderedIds: string[]) => {
    if (!eventId || !playlist || !canManage) return;
    const prev = playlist;
    const byId = new Map(playlist.songs.map((s) => [s.id, s]));
    const nextSongs = orderedIds
      .map((id, i) => {
        const song = byId.get(id);
        return song ? { ...song, sortOrder: i } : null;
      })
      .filter((s): s is PlaylistSong => s != null);
    setPlaylist({ ...playlist, songs: nextSongs });
    const result = await reorderPlaylistSongs(eventId, playlist.sectionId, orderedIds);
    if (!result.ok) {
      setPlaylist(prev);
      Alert.alert(t('playlists.reorderFail'), t('common.tryAgain'));
    }
  };

  const onToggleMust = async (song: PlaylistSong) => {
    if (!canManage || !playlist) return;
    const next = !song.mustPlay;
    setPlaylist({
      ...playlist,
      songs: playlist.songs.map((s) =>
        s.id === song.id ? { ...s, mustPlay: next, doNotPlay: next ? false : s.doNotPlay } : s,
      ),
    });
    if (!(await setMustPlay(song.id, next))) {
      setPlaylist(playlist);
      Alert.alert(t('common.couldntSave'), t('common.checkConnection'));
    }
  };

  if (loading && !playlist) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <PlaylistDetail
          playlist={{
            sectionId: sectionId ?? '',
            title: t('playlists.emptyTitle'),
            songLimit: null,
            songs: [],
          }}
          canManage={false}
          reordering={false}
          onToggleReorder={() => {}}
          onBack={() => router.back()}
          onAdd={() => {}}
          onRemove={() => {}}
          onReorder={() => {}}
        />
      </View>
    );
  }

  const openAdd = () => {
    if (playlistAtLimit(playlist)) {
      Alert.alert(t('playlists.atLimit', { limit: playlist.songLimit ?? 0 }));
      return;
    }
    music.open({ sectionId: playlist.sectionId, segment: 'search' });
  };

  return (
    <View style={{ flex: 1 }}>
      <PlaylistDetail
        playlist={playlist}
        canManage={canManage}
        userId={userId}
        reordering={reordering}
        onToggleReorder={() => setReordering((v) => !v)}
        onBack={() => router.back()}
        onAdd={openAdd}
        onRemove={(song) => {
          void onRemove(song);
        }}
        onReorder={(ids) => {
          void onReorder(ids);
        }}
        onToggleMust={(song) => {
          void onToggleMust(song);
        }}
      />
      {music.sheet}
    </View>
  );
}
