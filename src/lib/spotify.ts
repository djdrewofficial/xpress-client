import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

/* Couple's personal Spotify connection (OAuth) so they can import their own
   playlists. The token round-trip happens through XOS; here we just open the
   in-app browser and read the resulting connection + playlists.
   NOTE: the deep-link return only works in a dev/standalone build, not Expo Go. */

const RETURN_URL = 'xpressclient://spotify-callback';

export type SpotifyPlaylist = { id: string; name: string; image: string | null; trackCount: number; owner: string | null };
export type SpotifyTrack = {
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

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function spotifyStatus(): Promise<{ connected: boolean; displayName: string | null }> {
  const base = apiBase();
  if (!base) return { connected: false, displayName: null };
  try {
    const res = await fetch(`${base}/api/spotify/status`, { headers: await authHeader() });
    if (!res.ok) return { connected: false, displayName: null };
    return (await res.json()) as { connected: boolean; displayName: string | null };
  } catch {
    return { connected: false, displayName: null };
  }
}

/** Open Spotify login in an in-app browser; resolves true once connected. */
export async function connectSpotify(): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/spotify/auth-url?return=${encodeURIComponent(RETURN_URL)}`, {
      headers: await authHeader(),
    });
    if (!res.ok) return false;
    const { url } = (await res.json()) as { url?: string };
    if (!url) return false;
    const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
    if (result.type !== 'success') return false;
    // The callback set spotify=connected on the deep link; confirm via status.
    return (await spotifyStatus()).connected;
  } catch {
    return false;
  }
}

export async function spotifyPlaylists(): Promise<SpotifyPlaylist[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/spotify/playlists`, { headers: await authHeader() });
    if (!res.ok) return [];
    const { playlists } = (await res.json()) as { playlists?: SpotifyPlaylist[] };
    return playlists ?? [];
  } catch {
    return [];
  }
}

export async function spotifyPlaylistTracks(id: string): Promise<SpotifyTrack[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/spotify/playlist-tracks?id=${encodeURIComponent(id)}`, {
      headers: await authHeader(),
    });
    if (!res.ok) return [];
    const { tracks } = (await res.json()) as { tracks?: SpotifyTrack[] };
    return tracks ?? [];
  } catch {
    return [];
  }
}

/** Bind a section to live-sync a playlist (auto-updates hourly). Returns how
    many songs the initial sync added, or null on failure. */
export async function enablePlaylistSync(
  eventId: string,
  sectionId: string,
  playlistId: string,
  playlistName: string,
): Promise<{ added: number; removed: number } | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/mobile/planning/spotify-sync`, {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enable', eventId, sectionId, playlistId, playlistName }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { added?: number; removed?: number };
    return { added: j.added ?? 0, removed: j.removed ?? 0 };
  } catch {
    return null;
  }
}

export async function disablePlaylistSync(eventId: string, sectionId: string): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/mobile/planning/spotify-sync`, {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable', eventId, sectionId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
