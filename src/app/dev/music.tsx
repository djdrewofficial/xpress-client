import { Redirect, useLocalSearchParams } from 'expo-router';

import { useDevLocale } from '@/lib/devLocale';
import { View } from 'react-native';

import { AddMusicSheet, resultKey } from '@/components/music/AddMusicSheet';
import { MusicRecord } from '@/components/music/MusicRecord';
import type { MusicMoment } from '@/components/music/model';
import { TabBar, ThemeSchemeOverride } from '@/components/ui';
import type { Track } from '@/lib/musicSearch';
import type { SpotifyTrack } from '@/lib/spotify';

/**
 * Dev-only preview of the Music record, add sheet, and import preview.
 * Sample titles only — not linked from the app. /dev/music?sheet=add|import&scheme=dark
 */
const MOMENTS: MusicMoment[] = [
  {
    id: 'processional',
    side: 'A',
    index: 1,
    title: 'Processional',
    isOpenDancing: false,
    doNotPlay: [],
    tracks: [
      {
        id: 'p1',
        title: 'Sample Song Title',
        artist: 'Sample Artist',
        mustPlay: true,
        doNotPlay: false,
        note: 'Doors open on the first chorus. Fade the intro.',
      },
    ],
  },
  {
    id: 'bride',
    side: 'A',
    index: 2,
    title: 'Bride entrance',
    isOpenDancing: false,
    doNotPlay: [],
    tracks: [{ id: 'b1', title: 'Sample Slow Dance', artist: 'Sample Duo', mustPlay: false, doNotPlay: false, note: null }],
  },
  {
    id: 'recessional',
    side: 'A',
    index: 3,
    title: 'Recessional',
    isOpenDancing: false,
    tracks: [],
    doNotPlay: [],
  },
  {
    id: 'entrance',
    side: 'B',
    index: 1,
    title: 'Grand Entrance',
    isOpenDancing: false,
    doNotPlay: [],
    tracks: [
      {
        id: 'g1',
        title: 'Sample Entrance Anthem',
        artist: 'Sample Artist',
        mustPlay: true,
        doNotPlay: false,
        note: 'Party first, then hold for a beat before you announce us.',
      },
      { id: 'g2', title: 'Sample Backup Song', artist: 'Sample Band', mustPlay: false, doNotPlay: false, note: null },
    ],
  },
  {
    id: 'dancing',
    side: 'B',
    index: 2,
    title: 'Open Dancing',
    isOpenDancing: true,
    tracks: [
      { id: 'd1', title: 'Sample Floor Filler', artist: 'Sample Artist', mustPlay: true, doNotPlay: false, note: null },
      { id: 'd2', title: 'Sample Throwback', artist: 'Sample Crew', mustPlay: false, doNotPlay: false, note: null },
    ],
    doNotPlay: [],
  },
  {
    id: 'avoid',
    side: 'B',
    index: 3,
    title: 'Do not play',
    isOpenDancing: false,
    tracks: [
      { id: 'n1', title: 'Sample Overplayed Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: true, note: null },
      { id: 'n2', title: 'Sample Line Dance', artist: 'Sample Band', mustPlay: false, doNotPlay: true, note: null },
    ],
    doNotPlay: [],
  },
];

const SECTIONS = MOMENTS.map((m) => ({ id: m.id, title: m.title, label: `${m.side}${m.index}` }));

const RESULTS: Track[] = [
  { provider: 'spotify', providerId: 'sample-1', title: 'Sample Entrance Anthem', artist: 'Sample Artist' },
  { provider: 'apple', providerId: 'sample-2', title: 'Sample Song Title', artist: 'Sample Artist' },
  { provider: 'apple', providerId: 'sample-3', title: 'Sample Slow Dance', artist: 'Sample Duo' },
  { provider: 'spotify', providerId: 'sample-4', title: 'Sample Party Starter', artist: 'Sample Crew' },
  { provider: 'youtube', providerId: 'sample-5', title: 'Sample Live Version', artist: 'Pasted YouTube link' },
];

const PLAYLIST: SpotifyTrack[] = [
  track('a1', 'Sample Song One', 'Sample Artist'),
  track('a2', 'Sample Song Two', 'Sample Band'),
  track('a3', 'Sample Overplayed Song', 'Sample Artist'),
  track('a4', 'Sample Song Four', 'Sample Duo'),
];

function track(id: string, title: string, artist: string): SpotifyTrack {
  return {
    provider: 'spotify',
    providerId: id,
    isrc: null,
    title,
    artist,
    album: null,
    artworkUrl: null,
    durationMs: null,
    previewUrl: null,
    externalUrl: null,
  };
}

export default function DevMusicPreview() {
  useDevLocale();
  const params = useLocalSearchParams<{ sheet?: string; scheme?: string }>();
  if (!__DEV__) return <Redirect href="/login" />;
  const scheme = params.scheme === 'dark' ? 'dark' : 'light';
  const sheet = params.sheet === 'add' || params.sheet === 'import' || params.sheet === 'sources' ? params.sheet : null;

  return (
    <ThemeSchemeOverride scheme={scheme}>
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: scheme === 'dark' ? '#120c1e' : '#f6f2ff' }}>
        <View style={{ width: 402, maxWidth: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <MusicRecord
            moments={MOMENTS}
            bottomPad={24}
            onOpenMoment={() => {}}
            onAddToMoment={() => {}}
            onAddMusic={() => {}}
            onImport={() => {}}
            onSearch={() => {}}
          />
          {sheet ? null : <TabBar active="music" />}
          <AddMusicSheet
            visible={sheet != null}
            onClose={() => {}}
            initialSegment={sheet === 'import' || sheet === 'sources' ? 'import' : 'search'}
            eventId="sample-event"
            sections={SECTIONS}
            sectionId="entrance"
            existingTitles={new Set(['Sample Song Two'])}
            fixtures={{
              initialQuery: 'sample',
              searchResults: RESULTS,
              doNotPlayTitles: ['Sample Overplayed Song'],
              seedAddedKeys: sheet === 'add'
                ? [
                    resultKey('spotify', 'sample-1', 'Sample Entrance Anthem', 'Sample Artist'),
                    resultKey('apple', 'sample-2', 'Sample Song Title', 'Sample Artist'),
                  ]
                : [],
              playlist: {
                name: 'Sample Dinner Vibes',
                url: 'https://open.spotify.example/playlist/sample',
                tracks: PLAYLIST,
              },
              startOnPreview: sheet === 'import',
            }}
          />
        </View>
      </View>
    </ThemeSchemeOverride>
  );
}
