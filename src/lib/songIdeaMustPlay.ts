import type { EventSongIdea } from '@/lib/moderation';

/** Fields needed to insert a song idea onto the dance-floor section. */
export type SongIdeaSeed = Pick<EventSongIdea, 'id' | 'title' | 'artist'>;

/** Manual addSong payload for an idea (ideas have no catalog provider id). */
export function songIdeaToAddPayload(idea: SongIdeaSeed) {
  return {
    title: idea.title.trim() || 'Untitled',
    artist: idea.artist?.trim() || null,
    provider: 'manual' as const,
    provider_id: null,
  };
}

export type MoveSongIdeaResult =
  | { ok: true; songId: string; ideaHidden: boolean }
  | { ok: false; step: 'add' | 'mustPlay' | 'hide' };
