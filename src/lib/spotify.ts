import { apiBase, authHeader } from '@/lib/api';

/* Public playlist import by pasted link (Spotify OR Apple Music), read with
   XOS's own app credentials — no user login/OAuth. The former personal-Spotify
   OAuth + hourly-sync surface was removed after that pivot. */

// A track from a pasted playlist — Spotify OR Apple Music (carries its own provider).
export type SpotifyTrack = {
  provider?: 'spotify' | 'apple' | 'youtube';
  providerId: string;
  isrc: string | null;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  previewUrl: string | null;
  externalUrl: string | null;
};

export type PlaylistImport = { name: string | null; tracks: SpotifyTrack[] };
export type PlaylistImportError = 'bad_link' | 'not_found' | 'restricted' | 'unconfigured' | 'failed';

/** Read a PUBLIC playlist by pasted link — Spotify OR Apple Music, auto-detected
    server-side. Uses XOS's app credentials (no user login), so it isn't gated by
    Spotify's extended-quota approval or an Apple Music subscription. */
export async function importPublicPlaylist(url: string): Promise<PlaylistImport | { error: PlaylistImportError }> {
  const base = apiBase();
  if (!base) return { error: 'unconfigured' };
  try {
    const res = await fetch(`${base}/api/music/playlist?url=${encodeURIComponent(url)}`, { headers: await authHeader() });
    const j = (await res.json().catch(() => ({}))) as { name?: string | null; tracks?: SpotifyTrack[]; error?: string };
    if (!res.ok) return { error: (j.error as PlaylistImportError) ?? 'failed' };
    return { name: j.name ?? null, tracks: j.tracks ?? [] };
  } catch {
    return { error: 'failed' };
  }
}
