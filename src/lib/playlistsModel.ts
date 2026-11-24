/** One song inside a playlist moment, as returned by the mobile playlists API. */
export type PlaylistSong = {
  id: string;
  title: string;
  artist: string | null;
  note: string | null;
  externalUrl: string | null;
  requestedBy: string | null;
  mustPlay: boolean;
  doNotPlay: boolean;
  sortOrder: number;
  likeCount: number;
  likedByMe: boolean;
};

/** A playlist moment (planning section with is_playlist). */
export type EventPlaylist = {
  sectionId: string;
  title: string;
  songLimit: number | null;
  songs: PlaylistSong[];
};

export type PlaylistLocale = 'en' | 'es';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function flag(value: unknown): boolean {
  return value === true;
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''));
}

/** Kept local so unit tests can import this module under node --experimental-strip-types. */
const SUBTITLE = {
  en: {
    noSongsYet: 'No songs yet',
    songCount: '{{count}} song',
    songsCount: '{{count}} songs',
    countWithLimit: '{{count}} · up to {{limit}}',
  },
  es: {
    noSongsYet: 'Todavía no hay canciones',
    songCount: '{{count}} canción',
    songsCount: '{{count}} canciones',
    countWithLimit: '{{count}} · hasta {{limit}}',
  },
} as const;

/** Parse one song row from the playlists / content API. */
export function parsePlaylistSong(value: unknown): PlaylistSong | null {
  const row = asRecord(value);
  const id = str(row?.id);
  if (!id || !row) return null;
  return {
    id,
    title: str(row.title) ?? '',
    artist: str(row.artist),
    note: str(row.note),
    externalUrl: str(row.externalUrl),
    requestedBy: str(row.requestedBy),
    mustPlay: flag(row.mustPlay),
    doNotPlay: flag(row.doNotPlay),
    sortOrder: num(row.sortOrder) ?? 0,
    likeCount: num(row.likeCount) ?? 0,
    likedByMe: flag(row.likedByMe),
  };
}

/** Parse one playlist from the playlists / content API. */
export function parsePlaylist(value: unknown): EventPlaylist | null {
  const row = asRecord(value);
  const sectionId = str(row?.sectionId);
  if (!sectionId || !row) return null;
  const songs = Array.isArray(row.songs)
    ? row.songs.map(parsePlaylistSong).filter((s): s is PlaylistSong => s != null)
    : [];
  songs.sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    sectionId,
    title: str(row.title) ?? '',
    songLimit: num(row.songLimit),
    songs,
  };
}

/** Parse `{ playlists: [...] }` from GET /playlists or from /content. */
export function parsePlaylistsPayload(value: unknown): EventPlaylist[] {
  const row = asRecord(value) ?? {};
  const list = Array.isArray(row.playlists) ? row.playlists : Array.isArray(value) ? value : [];
  return list.map(parsePlaylist).filter((p): p is EventPlaylist => p != null);
}

/** True when the Music tab should show the playlist list (not the legacy record). */
export function shouldUsePlaylistView(playlists: EventPlaylist[] | null | undefined): boolean {
  return Array.isArray(playlists) && playlists.length > 0;
}

/** Aggregate must-play / do-not-play counts across all playlists. */
export function playlistMusicStats(playlists: EventPlaylist[]): {
  songs: number;
  playlists: number;
  mustPlay: number;
  doNotPlay: number;
} {
  const songs = playlists.flatMap((p) => p.songs);
  return {
    songs: songs.length,
    playlists: playlists.length,
    mustPlay: songs.filter((s) => s.mustPlay && !s.doNotPlay).length,
    doNotPlay: songs.filter((s) => s.doNotPlay).length,
  };
}

/**
 * Subtitle under a playlist row: song count, plus the limit when the DJ set one.
 * e.g. "3 songs · up to 20" / "No songs yet"
 */
export function playlistRowSubtitle(
  playlist: Pick<EventPlaylist, 'songs' | 'songLimit'>,
  locale: PlaylistLocale = 'en',
): string {
  const table = SUBTITLE[locale];
  const count = playlist.songs.length;
  const countLabel =
    count === 0
      ? table.noSongsYet
      : fill(count === 1 ? table.songCount : table.songsCount, { count });
  if (playlist.songLimit == null) return countLabel;
  return fill(table.countWithLimit, {
    count: countLabel,
    limit: playlist.songLimit,
  });
}

/** Apply a drag reorder locally; returns a new array with updated sortOrder. */
export function applySongReorder<T extends { id: string; sortOrder: number }>(
  songs: T[],
  from: number,
  to: number,
): T[] {
  if (from === to || from < 0 || to < 0 || from >= songs.length || to >= songs.length) {
    return songs;
  }
  const next = songs.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((song, i) => ({ ...song, sortOrder: i }));
}

/** Prefer the dance-floor playlist for Must Play promotions from song ideas. */
export function defaultPlaylistForMustPlay(playlists: EventPlaylist[]): EventPlaylist | undefined {
  return (
    playlists.find((p) => /dance floor|open dancing|dancing/i.test(p.title)) ??
    playlists.find((p) => !/prelude|cocktail|dinner/i.test(p.title)) ??
    playlists[0]
  );
}

/** True when the playlist is at its song limit (blocks further adds). */
export function playlistAtLimit(playlist: Pick<EventPlaylist, 'songs' | 'songLimit'>): boolean {
  return playlist.songLimit != null && playlist.songs.length >= playlist.songLimit;
}

/** Bodies posted to POST /api/mobile/planning/songs (for tests + client). */
export function songAddBody(eventId: string, song: {
  sectionId: string;
  title: string;
  artist?: string | null;
  note?: string | null;
  externalUrl?: string | null;
  provider?: 'spotify' | 'apple' | 'youtube' | 'manual';
  providerId?: string | null;
  album?: string | null;
  artworkUrl?: string | null;
  previewUrl?: string | null;
}) {
  return {
    action: 'add' as const,
    eventId,
    song: {
      sectionId: song.sectionId,
      title: song.title,
      artist: song.artist ?? null,
      note: song.note ?? null,
      externalUrl: song.externalUrl ?? null,
      provider: song.provider ?? 'manual',
      providerId: song.providerId ?? null,
      album: song.album ?? null,
      artworkUrl: song.artworkUrl ?? null,
      previewUrl: song.previewUrl ?? null,
    },
  };
}

export function songRemoveBody(eventId: string, songId: string) {
  return { action: 'remove' as const, eventId, songId };
}

export function songReorderBody(eventId: string, sectionId: string, orderedIds: string[]) {
  return { action: 'reorder' as const, eventId, sectionId, orderedIds };
}
