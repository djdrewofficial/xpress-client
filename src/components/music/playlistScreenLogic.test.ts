import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applySongReorder,
  defaultPlaylistForMustPlay,
  playlistAtLimit,
  playlistRowSubtitle,
  shouldUsePlaylistView,
  type EventPlaylist,
  type PlaylistSong,
} from '../../lib/playlistsModel.ts';

/** Mirrors the optimistic reorder path used by the playlist detail screen. */
function reorderPlaylistLocally(playlist: EventPlaylist, from: number, to: number): EventPlaylist {
  return {
    ...playlist,
    songs: applySongReorder(playlist.songs, from, to),
  };
}

function song(id: string, sortOrder: number, extras: Partial<PlaylistSong> = {}): PlaylistSong {
  return {
    id,
    title: id,
    artist: null,
    note: null,
    externalUrl: null,
    requestedBy: null,
    mustPlay: false,
    doNotPlay: false,
    sortOrder,
    likeCount: 0,
    likedByMe: false,
    ...extras,
  };
}

test('playlist screen reorder updates local song order before the API round-trip', () => {
  const playlist: EventPlaylist = {
    sectionId: 'dance',
    title: 'Dance Floor Suggestions',
    songLimit: 20,
    songs: [song('a', 0), song('b', 1), song('c', 2)],
  };
  const next = reorderPlaylistLocally(playlist, 2, 0);
  assert.deepEqual(
    next.songs.map((s) => s.id),
    ['c', 'a', 'b'],
  );
  assert.deepEqual(
    next.songs.map((s) => s.sortOrder),
    [0, 1, 2],
  );
});

test('playlist screen blocks add when at the song limit', () => {
  const playlist: EventPlaylist = {
    sectionId: 'dinner',
    title: 'Dinner Music',
    songLimit: 2,
    songs: [song('a', 0), song('b', 1)],
  };
  assert.equal(playlistAtLimit(playlist), true);
  assert.equal(playlistAtLimit({ ...playlist, songLimit: 3 }), false);
});

test('Music tab chooses playlist list vs legacy record from payload length', () => {
  assert.equal(shouldUsePlaylistView([]), false);
  assert.equal(
    shouldUsePlaylistView([
      { sectionId: '1', title: 'Cocktail Vibes', songLimit: null, songs: [] },
    ]),
    true,
  );
});

test('Must Play from song ideas targets the dance-floor playlist', () => {
  const playlists: EventPlaylist[] = [
    { sectionId: 'prelude', title: 'Ceremony Prelude (Guest Arrival)', songLimit: null, songs: [] },
    { sectionId: 'dance', title: 'Dance Floor Suggestions', songLimit: 50, songs: [] },
  ];
  assert.equal(defaultPlaylistForMustPlay(playlists)?.sectionId, 'dance');
});

test('playlist row subtitle is plain English with an optional limit', () => {
  assert.equal(
    playlistRowSubtitle(
      {
        songs: [song('a', 0), song('b', 1), song('c', 2)],
        songLimit: 20,
      },
      'en',
    ),
    '3 songs · up to 20',
  );
});
