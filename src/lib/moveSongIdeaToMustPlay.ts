import { hideContent } from '@/lib/moderation';
import { addSong, setMustPlay } from '@/lib/planning';
import {
  songIdeaToAddPayload,
  type MoveSongIdeaResult,
  type SongIdeaSeed,
} from '@/lib/songIdeaMustPlay';

/**
 * Move a song idea onto the Must Play path: insert on the dance-floor section,
 * mark must-play, then hide the idea from the Music feed. Uses existing
 * planning_songs + content/hide APIs — no new schema.
 */
export async function moveSongIdeaToMustPlay(
  eventId: string,
  sectionId: string,
  idea: SongIdeaSeed,
): Promise<MoveSongIdeaResult> {
  let songId: string;
  try {
    const row = await addSong(eventId, sectionId, songIdeaToAddPayload(idea));
    if (!row?.id) return { ok: false, step: 'add' };
    songId = row.id;
  } catch {
    return { ok: false, step: 'add' };
  }

  const marked = await setMustPlay(songId, true);
  if (!marked) return { ok: false, step: 'mustPlay' };

  const hidden = await hideContent(eventId, { targetType: 'song_idea', targetId: idea.id });
  if (!hidden.ok) return { ok: true, songId, ideaHidden: false };
  return { ok: true, songId, ideaHidden: true };
}
