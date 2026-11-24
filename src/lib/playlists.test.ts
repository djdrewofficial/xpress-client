import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applySongReorder,
  defaultPlaylistForMustPlay,
  parsePlaylist,
  parsePlaylistsPayload,
  parsePlaylistSong,
  playlistAtLimit,
  playlistMusicStats,
  playlistRowSubtitle,
  shouldUsePlaylistView,
  songAddBody,
  songRemoveBody,
  songReorderBody,
} from './playlistsModel.ts';

test('parsePlaylistSong maps camelCase API fields', () => {
  const song = parsePlaylistSong({
    id: 's1',
    title: 'Levitating',
    artist: 'Dua Lipa',
    note: 'Drop at chorus',
    externalUrl: 'https://example.com/t',
    requestedBy: 'u1',
    mustPlay: true,
    doNotPlay: false,
    sortOrder: 2,
    likeCount: 3,
    likedByMe: true,
  });
  assert.deepEqual(song, {
    id: 's1',
    title: 'Levitating',
    artist: 'Dua Lipa',
    note: 'Drop at chorus',
    externalUrl: 'https://example.com/t',
    requestedBy: 'u1',
    mustPlay: true,
    doNotPlay: false,
    sortOrder: 2,
    likeCount: 3,
    likedByMe: true,
  });
});

test('parsePlaylistSong rejects rows without an id', () => {
  assert.equal(parsePlaylistSong({ title: 'Nope' }), null);
  assert.equal(parsePlaylistSong(null), null);
});

test('parsePlaylistsPayload sorts songs and skips bad rows', () => {
  const playlists = parsePlaylistsPayload({
    playlists: [
      {
        sectionId: 'p1',
        title: 'Cocktail Vibes',
        songLimit: 20,
        songs: [
          { id: 'b', title: 'B', sortOrder: 1 },
          { id: 'a', title: 'A', sortOrder: 0 },
          { title: 'missing-id' },
        ],
      },
      { title: 'no-section' },
    ],
  });
  assert.equal(playlists.length, 1);
  assert.equal(playlists[0].title, 'Cocktail Vibes');
  assert.equal(playlists[0].songLimit, 20);
  assert.deepEqual(
    playlists[0].songs.map((s) => s.id),
    ['a', 'b'],
  );
});

test('parsePlaylist accepts a bare playlist object', () => {
  const playlist = parsePlaylist({
    sectionId: 'x',
    title: 'Dinner Music',
    songLimit: null,
    songs: [],
  });
  assert.equal(playlist?.sectionId, 'x');
  assert.equal(playlist?.songLimit, null);
  assert.equal(playlist?.songs.length, 0);
});

test('shouldUsePlaylistView is true only when playlists exist', () => {
  assert.equal(shouldUsePlaylistView(undefined), false);
  assert.equal(shouldUsePlaylistView(null), false);
  assert.equal(shouldUsePlaylistView([]), false);
  assert.equal(
    shouldUsePlaylistView([{ sectionId: '1', title: 'A', songLimit: null, songs: [] }]),
    true,
  );
});

test('playlistRowSubtitle shows count and optional limit', () => {
  assert.equal(playlistRowSubtitle({ songs: [], songLimit: null }, 'en'), 'No songs yet');
  assert.equal(
    playlistRowSubtitle({ songs: [{ id: '1' } as never], songLimit: null }, 'en'),
    '1 song',
  );
  assert.equal(
    playlistRowSubtitle(
      { songs: [{ id: '1' } as never, { id: '2' } as never], songLimit: 20 },
      'en',
    ),
    '2 songs · up to 20',
  );
  assert.equal(
    playlistRowSubtitle({ songs: [], songLimit: 10 }, 'es'),
    'Todavía no hay canciones · hasta 10',
  );
});

test('applySongReorder moves an item and renumbers sortOrder', () => {
  const songs = [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ];
  assert.deepEqual(
    applySongReorder(songs, 0, 2).map((s) => s.id),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(
    applySongReorder(songs, 0, 2).map((s) => s.sortOrder),
    [0, 1, 2],
  );
  assert.equal(applySongReorder(songs, 1, 1), songs);
  assert.equal(applySongReorder(songs, -1, 1), songs);
});

test('playlistMusicStats aggregates flags across playlists', () => {
  const stats = playlistMusicStats([
    {
      sectionId: '1',
      title: 'A',
      songLimit: null,
      songs: [
        {
          id: '1',
          title: 'Must',
          artist: null,
          note: null,
          externalUrl: null,
          requestedBy: null,
          mustPlay: true,
          doNotPlay: false,
          sortOrder: 0,
          likeCount: 0,
          likedByMe: false,
        },
        {
          id: '2',
          title: 'Ban',
          artist: null,
          note: null,
          externalUrl: null,
          requestedBy: null,
          mustPlay: false,
          doNotPlay: true,
          sortOrder: 1,
          likeCount: 0,
          likedByMe: false,
        },
      ],
    },
    {
      sectionId: '2',
      title: 'B',
      songLimit: 5,
      songs: [
        {
          id: '3',
          title: 'Ok',
          artist: null,
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
  ]);
  assert.deepEqual(stats, { songs: 3, playlists: 2, mustPlay: 1, doNotPlay: 1 });
});

test('defaultPlaylistForMustPlay prefers dance-floor titles', () => {
  const playlists = [
    { sectionId: '1', title: 'Ceremony Prelude (Guest Arrival)', songLimit: null, songs: [] },
    { sectionId: '2', title: 'Cocktail Vibes', songLimit: null, songs: [] },
    { sectionId: '3', title: 'Dance Floor Suggestions', songLimit: null, songs: [] },
  ];
  assert.equal(defaultPlaylistForMustPlay(playlists)?.sectionId, '3');
  assert.equal(defaultPlaylistForMustPlay(playlists.slice(0, 2))?.sectionId, '1');
  assert.equal(defaultPlaylistForMustPlay([]), undefined);
});

test('playlistAtLimit respects a null or numeric songLimit', () => {
  assert.equal(playlistAtLimit({ songs: [{ id: '1' } as never], songLimit: null }), false);
  assert.equal(playlistAtLimit({ songs: [{ id: '1' } as never], songLimit: 2 }), false);
  assert.equal(
    playlistAtLimit({ songs: [{ id: '1' } as never, { id: '2' } as never], songLimit: 2 }),
    true,
  );
});

test('song mutation bodies match the XOS planning/songs contract', () => {
  assert.deepEqual(
    songAddBody('evt-1', {
      sectionId: 'sec-1',
      title: 'Levitating',
      artist: 'Dua Lipa',
      provider: 'apple',
      providerId: 'abc',
    }),
    {
      action: 'add',
      eventId: 'evt-1',
      song: {
        sectionId: 'sec-1',
        title: 'Levitating',
        artist: 'Dua Lipa',
        note: null,
        externalUrl: null,
        provider: 'apple',
        providerId: 'abc',
        album: null,
        artworkUrl: null,
        previewUrl: null,
      },
    },
  );
  assert.deepEqual(songRemoveBody('evt-1', 'song-9'), {
    action: 'remove',
    eventId: 'evt-1',
    songId: 'song-9',
  });
  assert.deepEqual(songReorderBody('evt-1', 'sec-1', ['a', 'b']), {
    action: 'reorder',
    eventId: 'evt-1',
    sectionId: 'sec-1',
    orderedIds: ['a', 'b'],
  });
});
