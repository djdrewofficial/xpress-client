import { apiBase, authorizedFetch } from '@/lib/api';
import { pickSearchHit } from '@/lib/musicSearchMatch';

export { pickSearchHit } from '@/lib/musicSearchMatch';

/* Talks to the XOS music endpoints (search across Spotify/Apple/YouTube +
   iTunes preview resolution) using the signed-in user's Supabase token. */

export type Track = {
  provider: 'spotify' | 'apple' | 'youtube';
  providerId: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  previewUrl?: string | null;
  externalUrl?: string | null;
};


/** Search the catalog. Returns [] if the API isn't configured or the user is signed out. */
export async function searchTracks(query: string): Promise<Track[]> {
  const base = apiBase();
  const q = query.trim();
  if (!base || q.length < 2) return [];
  try {
    const res = await authorizedFetch(`${base}/api/music/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Track[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}

/** Resolve a 30-second preview clip (iTunes) when a track has none. */
export async function resolvePreview(title: string, artist: string): Promise<string | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await authorizedFetch(
      `${base}/api/music/preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string | null };
    return json.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve artwork + preview for a free-text song (e.g. a song idea with no
 * provider id) using the same catalog search + iTunes preview endpoints as Add music.
 */
export async function resolveTrackMedia(
  title: string,
  artist?: string | null,
): Promise<{ artworkUrl: string | null; previewUrl: string | null }> {
  const q = [title, artist].filter((part) => part && String(part).trim()).join(' ');
  const hit = pickSearchHit(await searchTracks(q), title, artist);
  let previewUrl = hit?.previewUrl ?? null;
  if (!previewUrl) previewUrl = await resolvePreview(title, artist ?? '');
  return { artworkUrl: hit?.artworkUrl ?? null, previewUrl };
}
