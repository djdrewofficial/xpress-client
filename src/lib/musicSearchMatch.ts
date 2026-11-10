/** Minimal track shape used when matching catalog search hits to free-text songs. */
export type SearchHit = {
  title: string;
  artist: string;
  artworkUrl?: string | null;
  previewUrl?: string | null;
};

/** Prefer an exact title and artist match, then title-only, else the first search hit. */
export function pickSearchHit<T extends SearchHit>(
  results: T[],
  title: string,
  artist?: string | null,
): T | null {
  if (results.length === 0) return null;
  const t = title.trim().toLowerCase();
  const a = artist?.trim().toLowerCase() ?? '';
  const exactBoth = a
    ? results.find(
        (row) => row.title.trim().toLowerCase() === t && row.artist.trim().toLowerCase() === a,
      )
    : null;
  if (exactBoth) return exactBoth;
  return results.find((row) => row.title.trim().toLowerCase() === t) ?? results[0] ?? null;
}
