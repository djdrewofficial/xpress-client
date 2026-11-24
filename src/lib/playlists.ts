import { apiBase, authorizedFetch } from '@/lib/api';
import { mobileJson } from '@/lib/mobileJson';
import {
  parsePlaylistsPayload,
  songAddBody,
  songRemoveBody,
  songReorderBody,
  type EventPlaylist,
  type PlaylistSong,
} from '@/lib/playlistsModel';

export type {
  EventPlaylist,
  PlaylistSong,
} from '@/lib/playlistsModel';

export {
  applySongReorder,
  defaultPlaylistForMustPlay,
  parsePlaylist,
  parsePlaylistSong,
  parsePlaylistsPayload,
  playlistAtLimit,
  playlistMusicStats,
  playlistRowSubtitle,
  shouldUsePlaylistView,
  songAddBody,
  songRemoveBody,
  songReorderBody,
} from '@/lib/playlistsModel';

export type PlaylistSongInput = {
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
};

export type PlaylistMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; status: number };

/** GET /api/mobile/events/:eventId/playlists */
export async function loadPlaylists(eventId: string): Promise<EventPlaylist[]> {
  const base = apiBase();
  if (!base || !eventId) return [];
  try {
    const res = await authorizedFetch(
      `${base}/api/mobile/events/${encodeURIComponent(eventId)}/playlists`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return parsePlaylistsPayload(json);
  } catch {
    return [];
  }
}

/** POST /api/mobile/planning/songs — add a song to a playlist moment. */
export async function addPlaylistSong(
  eventId: string,
  song: PlaylistSongInput,
): Promise<PlaylistMutationResult> {
  const res = await mobileJson('POST', '/api/mobile/planning/songs', songAddBody(eventId, song));
  if (!res.ok) return { ok: false, error: res.error || 'Failed', status: res.status };
  const data =
    res.data && typeof res.data === 'object' && !Array.isArray(res.data)
      ? (res.data as Record<string, unknown>)
      : {};
  const id = typeof data.id === 'string' ? data.id : undefined;
  return { ok: true, id };
}

/** POST /api/mobile/planning/songs — remove (soft-hide) a song. */
export async function removePlaylistSong(
  eventId: string,
  songId: string,
): Promise<PlaylistMutationResult> {
  const res = await mobileJson('POST', '/api/mobile/planning/songs', songRemoveBody(eventId, songId));
  if (!res.ok) return { ok: false, error: res.error || 'Failed', status: res.status };
  return { ok: true };
}

/** POST /api/mobile/planning/songs — reorder songs within one playlist. */
export async function reorderPlaylistSongs(
  eventId: string,
  sectionId: string,
  orderedIds: string[],
): Promise<PlaylistMutationResult> {
  const res = await mobileJson(
    'POST',
    '/api/mobile/planning/songs',
    songReorderBody(eventId, sectionId, orderedIds),
  );
  if (!res.ok) return { ok: false, error: res.error || 'Failed', status: res.status };
  return { ok: true };
}
