import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { MusicRecord } from '@/components/music/MusicRecord';
import { PlaylistsHome } from '@/components/music/PlaylistsHome';
import { ContentColumn } from '@/components/ui';
import { useAddMusic } from '@/components/music/AddMusicSheet';
import { buildMusicRecord, defaultMoment, type MusicMoment } from '@/components/music/model';
import { EventSwitcher } from '@/components/EventSwitcher';
import { MusicContentSafety } from '@/components/moderation/MusicContentSafety';
import { useAuth } from '@/lib/auth';
import { managesEvent } from '@/lib/membership';
import { useT } from '@/lib/i18n';
import { useEvent } from '@/lib/events';
import { loadEventSongs, loadOverview } from '@/lib/planning';
import {
  defaultPlaylistForMustPlay,
  loadPlaylists,
  shouldUsePlaylistView,
  type EventPlaylist,
} from '@/lib/playlists';

export default function MusicScreen() {
  const router = useRouter();
  const { t } = useT();
  const { profile, session } = useAuth();
  const { event, eventId, events, loading: eventLoading } = useEvent();
  const [moments, setMoments] = useState<MusicMoment[] | null>(null);
  const [playlists, setPlaylists] = useState<EventPlaylist[] | null>(null);
  const [switcher, setSwitcher] = useState(false);
  const [safetyReload, setSafetyReload] = useState(0);
  const [swipeDismiss, setSwipeDismiss] = useState(0);

  const load = useCallback(async () => {
    if (!eventId) {
      setMoments([]);
      setPlaylists([]);
      return;
    }
    try {
      const [overview, songs, playlistRows] = await Promise.all([
        loadOverview(eventId),
        loadEventSongs(eventId),
        loadPlaylists(eventId),
      ]);
      setPlaylists(playlistRows);
      setMoments(buildMusicRecord(overview.groups, songs));
    } catch {
      setMoments([]);
      setPlaylists([]);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
      setSafetyReload((n) => n + 1);
    }, [load]),
  );

  const usePlaylists = shouldUsePlaylistView(playlists);

  const sections = useMemo(() => {
    if (usePlaylists && playlists) {
      return playlists.map((p) => ({ id: p.sectionId, title: p.title }));
    }
    return (moments ?? [])
      .filter((m) => m.id !== 'do-not-play')
      .map((m) => ({
        id: m.id,
        title: m.title,
        label: `${m.side}${m.index}`,
      }));
  }, [usePlaylists, playlists, moments]);

  const music = useAddMusic({
    eventId: eventId ?? '',
    sections,
    onAdded: () => {
      load();
    },
    onReload: () => {
      load();
    },
  });

  const targetMoment = defaultMoment(moments ?? []);
  const targetPlaylist = defaultPlaylistForMustPlay(playlists ?? []);
  const mustPlaySectionId = usePlaylists
    ? (targetPlaylist?.sectionId ?? null)
    : (targetMoment?.id ?? null);
  const isStaff = profile?.accountType === 'staff';
  const canSwitch = isStaff || events.length > 1;

  const requireTarget = (run: (sectionId: string) => void) => {
    if (eventLoading || playlists === null || moments === null) return;
    const sectionId = usePlaylists ? targetPlaylist?.sectionId : targetMoment?.id;
    if (!sectionId) {
      Alert.alert(
        usePlaylists ? t('playlists.noPlaylistsAlert') : t('record.noMoments'),
        usePlaylists ? t('playlists.noPlaylistsBody') : t('record.noMomentsBody'),
      );
      return;
    }
    run(sectionId);
  };

  const openMoment = (moment: MusicMoment) => {
    if (!eventId || moment.id === 'do-not-play') return;
    router.push({ pathname: '/section/[id]', params: { id: moment.id, eventId } });
  };

  const openPlaylist = (playlist: EventPlaylist) => {
    if (!eventId) return;
    router.push({
      pathname: '/playlist/[sectionId]',
      params: { sectionId: playlist.sectionId, eventId },
    });
  };

  const safety = eventId && session?.user.id ? (
    <MusicContentSafety
      eventId={eventId}
      userId={session.user.id}
      canManage={managesEvent(event, profile?.accountType)}
      mustPlaySectionId={mustPlaySectionId}
      onCatalogChanged={() => {
        void load();
      }}
      reloadSignal={safetyReload}
      dismissSignal={swipeDismiss}
    />
  ) : null;

  const loading = eventLoading || moments === null || playlists === null;

  return (
    <View style={{ flex: 1 }}>
      <ContentColumn fill>
        {usePlaylists ? (
          <PlaylistsHome
            playlists={playlists ?? []}
            loading={loading}
            onOpenPlaylist={openPlaylist}
            onAddMusic={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'search' }))
            }
            onImport={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'import' }))
            }
            onSearch={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'search' }))
            }
            onSwitchEvent={canSwitch ? () => (isStaff ? router.push('/events') : setSwitcher(true)) : undefined}
            onScrollBeginDrag={() => setSwipeDismiss((n) => n + 1)}
            afterHero={safety}
          />
        ) : (
          <MusicRecord
            moments={moments ?? []}
            loading={loading}
            onOpenMoment={openMoment}
            onAddToMoment={(moment) => music.open({ sectionId: moment.id, segment: 'search' })}
            onAddMusic={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'search' }))
            }
            onImport={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'import' }))
            }
            onSearch={() =>
              requireTarget((sectionId) => music.open({ sectionId, segment: 'search' }))
            }
            onSwitchEvent={canSwitch ? () => (isStaff ? router.push('/events') : setSwitcher(true)) : undefined}
            onScrollBeginDrag={() => setSwipeDismiss((n) => n + 1)}
            afterHero={safety}
          />
        )}
      </ContentColumn>
      {music.sheet}
      {events.length > 1 ? <EventSwitcher visible={switcher} onClose={() => setSwitcher(false)} /> : null}
    </View>
  );
}
