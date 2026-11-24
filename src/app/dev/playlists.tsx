import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PlaylistDetail } from '@/components/music/PlaylistDetail';
import { PlaylistsHome } from '@/components/music/PlaylistsHome';
import { TabBar, ThemeSchemeOverride } from '@/components/ui';
import { useDevLocale } from '@/lib/devLocale';
import type { EventPlaylist } from '@/lib/playlists';

/**
 * Dev-only preview of the Music playlist list and a playlist detail screen.
 * /dev/playlists?view=home|detail&scheme=dark
 */
const PLAYLISTS: EventPlaylist[] = [
  {
    sectionId: 'prelude',
    title: 'Ceremony Prelude (Guest Arrival)',
    songLimit: null,
    songs: [
      {
        id: 'p1',
        title: 'Sample Prelude',
        artist: 'Sample Artist',
        note: null,
        externalUrl: null,
        requestedBy: null,
        mustPlay: false,
        doNotPlay: false,
        sortOrder: 0,
        likeCount: 0,
        likedByMe: false,
      },
    ],
  },
  {
    sectionId: 'cocktail',
    title: 'Cocktail Vibes',
    songLimit: 20,
    songs: [
      {
        id: 'c1',
        title: 'Sample Cocktail Track',
        artist: 'Sample Band',
        note: 'Keep it light',
        externalUrl: null,
        requestedBy: null,
        mustPlay: true,
        doNotPlay: false,
        sortOrder: 0,
        likeCount: 1,
        likedByMe: false,
      },
      {
        id: 'c2',
        title: 'Sample Lounge Song',
        artist: 'Sample Duo',
        note: null,
        externalUrl: null,
        requestedBy: null,
        mustPlay: false,
        doNotPlay: false,
        sortOrder: 1,
        likeCount: 0,
        likedByMe: false,
      },
    ],
  },
  {
    sectionId: 'dinner',
    title: 'Dinner Music',
    songLimit: 15,
    songs: [],
  },
  {
    sectionId: 'dance',
    title: 'Dance Floor Suggestions',
    songLimit: 50,
    songs: [
      {
        id: 'd1',
        title: 'Sample Floor Filler',
        artist: 'Sample Artist',
        note: null,
        externalUrl: null,
        requestedBy: null,
        mustPlay: true,
        doNotPlay: false,
        sortOrder: 0,
        likeCount: 2,
        likedByMe: true,
      },
      {
        id: 'd2',
        title: 'Sample Throwback',
        artist: 'Sample Crew',
        note: null,
        externalUrl: null,
        requestedBy: null,
        mustPlay: false,
        doNotPlay: false,
        sortOrder: 1,
        likeCount: 0,
        likedByMe: false,
      },
      {
        id: 'd3',
        title: 'Sample Overplayed Song',
        artist: 'Sample Artist',
        note: null,
        externalUrl: null,
        requestedBy: null,
        mustPlay: false,
        doNotPlay: true,
        sortOrder: 2,
        likeCount: 0,
        likedByMe: false,
      },
    ],
  },
];

export default function DevPlaylistsPreview() {
  useDevLocale();
  const params = useLocalSearchParams<{ view?: string; scheme?: string }>();
  if (!__DEV__) return <Redirect href="/login" />;
  const scheme = params.scheme === 'dark' ? 'dark' : 'light';
  const view = params.view === 'detail' ? 'detail' : 'home';
  const detail = PLAYLISTS.find((p) => p.sectionId === 'cocktail') ?? PLAYLISTS[0];

  return (
    <ThemeSchemeOverride scheme={scheme}>
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: scheme === 'dark' ? '#120c1e' : '#f6f2ff' }}>
        <View style={{ width: 402, maxWidth: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {view === 'detail' ? (
            <PlaylistDetail
              playlist={detail}
              canManage
              reordering={false}
              onToggleReorder={() => {}}
              onBack={() => {}}
              onAdd={() => {}}
              onRemove={() => {}}
              onReorder={() => {}}
              onToggleMust={() => {}}
            />
          ) : (
            <>
              <PlaylistsHome
                playlists={PLAYLISTS}
                bottomPad={24}
                onOpenPlaylist={() => {}}
                onAddMusic={() => {}}
                onImport={() => {}}
                onSearch={() => {}}
              />
              <TabBar active="music" />
            </>
          )}
        </View>
      </View>
    </ThemeSchemeOverride>
  );
}
