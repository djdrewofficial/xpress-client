import { supabase } from '@/lib/supabase';

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

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Search the catalog. Returns [] if the API isn't configured or the user is signed out. */
export async function searchTracks(query: string): Promise<Track[]> {
  const base = apiBase();
  const q = query.trim();
  if (!base || q.length < 2) return [];
  try {
    const res = await fetch(`${base}/api/music/search?q=${encodeURIComponent(q)}`, {
      headers: await authHeader(),
    });
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
    const res = await fetch(
      `${base}/api/music/preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
      { headers: await authHeader() },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string | null };
    return json.url ?? null;
  } catch {
    return null;
  }
}
