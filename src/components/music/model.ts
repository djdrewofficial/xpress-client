import { translate, type Locale } from '@/lib/i18n';
import { onMusic, onTimeline, type EventSong, type Group, type SectionRow } from '@/lib/planning';

export type RecordTrack = {
  id: string;
  title: string;
  artist: string | null;
  mustPlay: boolean;
  doNotPlay: boolean;
  note: string | null;
  authorName?: string | null;
  authorRemoved?: 'guest' | 'host' | null;
};

export type MusicMoment = {
  id: string;
  side: 'A' | 'B';
  index: number;
  title: string;
  isOpenDancing: boolean;
  /** Playable songs, in playlist order. */
  tracks: RecordTrack[];
  /**
   * Kept empty. Do-not-play songs belong on their own moment, not inside Open Dancing.
   */
  doNotPlay: RecordTrack[];
};

export type MusicStats = {
  songs: number;
  moments: number;
  mustPlay: number;
  doNotPlay: number;
};

/** Open-dancing playlist. Do-not-play songs stay on their own moment. */
export function isOpenDancingTitle(title: string): boolean {
  return /open\s*dancing/i.test(title) || /^dancing(\s+(music|playlist))?$/i.test(title);
}

/** A section whose whole job is the do-not-play list. */
export function isDoNotPlaySectionTitle(title: string): boolean {
  return /do\s*n[o']?t\s*play|dont\s*play/i.test(title);
}

/** Ceremony is Side A. Reception, cocktail, and the rest of the night are Side B. */
export function sideFor(groupTitle: string, sectionTitle: string): 'A' | 'B' {
  if (/ceremon/i.test(groupTitle)) return 'A';
  if (/reception|cocktail|dinner|party|dance|celebration|toast/i.test(groupTitle)) return 'B';
  if (/processional|recessional|prelude|vow|unity|bride|groom|ceremony|aisle/i.test(sectionTitle)) return 'A';
  return 'B';
}

function includeSection(groupTitle: string, section: SectionRow, hasSongs: boolean): boolean {
  if (!section.songs_enabled && !hasSongs) return false;
  if (/ceremon|reception|cocktail|dinner|party|dance|celebration|toast/i.test(groupTitle)) return true;
  if (onTimeline(section) || onMusic(section) || isOpenDancingTitle(section.title)) return true;
  if (/processional|recessional|prelude|vow|entrance|first dance|cake|parent dance|anniversary/i.test(section.title)) return true;
  return hasSongs;
}

function toTrack(song: EventSong, doNotPlay: boolean): RecordTrack {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    mustPlay: doNotPlay ? false : song.must_play,
    doNotPlay,
    note: song.note,
    authorName: song.authorName ?? null,
    authorRemoved: song.authorRemoved ?? null,
  };
}

/**
 * Fold the plan into a two-sided record.
 * The Do not play section is its own moment. Its songs are not copied onto Open Dancing.
 */
export function buildMusicRecord(groups: Group[], songs: EventSong[]): MusicMoment[] {
  const bySection = new Map<string, EventSong[]>();
  for (const song of songs) {
    const list = bySection.get(song.section_id) ?? [];
    list.push(song);
    bySection.set(song.section_id, list);
  }

  type Draft = { id: string; side: 'A' | 'B'; title: string; isOpenDancing: boolean; tracks: RecordTrack[] };
  const drafts: Draft[] = [];

  for (const group of groups) {
    for (const section of group.sections) {
      const sectionSongs = bySection.get(section.id) ?? [];
      if (!includeSection(group.title, section, sectionSongs.length > 0)) continue;
      const isDnp = isDoNotPlaySectionTitle(section.title);
      drafts.push({
        id: section.id,
        side: sideFor(group.title, section.title),
        title: section.title,
        isOpenDancing: isOpenDancingTitle(section.title),
        tracks: (isDnp ? sectionSongs : sectionSongs.filter((s) => !s.do_not_play)).map((s) => toTrack(s, isDnp)),
      });
    }
  }

  const ordered = [...drafts.filter((d) => d.side === 'A'), ...drafts.filter((d) => d.side === 'B')];
  const counts = { A: 0, B: 0 };
  return ordered.map((draft) => {
    counts[draft.side] += 1;
    return {
      id: draft.id,
      side: draft.side,
      index: counts[draft.side],
      title: draft.title,
      isOpenDancing: draft.isOpenDancing,
      tracks: draft.tracks,
      doNotPlay: [],
    };
  });
}

export function musicStats(moments: MusicMoment[]): MusicStats {
  const tracks = moments.flatMap((m) => m.tracks);
  const listed = moments.reduce((n, m) => n + m.doNotPlay.length, 0);
  return {
    songs: tracks.length + listed,
    moments: moments.length,
    mustPlay: tracks.filter((t) => t.mustPlay).length,
    doNotPlay: tracks.filter((t) => t.doNotPlay).length + listed,
  };
}

export function momentSongCount(moment: MusicMoment): number {
  return moment.tracks.length + moment.doNotPlay.length;
}

/** One-line subtitle under a moment title, matching the record layout. */
export function momentSubtitle(moment: MusicMoment, locale: Locale = 'en'): string {
  const first = moment.tracks[0];
  if (!first) return translate(locale, 'record.noSongYet');
  const extra = moment.tracks.length - 1;
  return extra > 0 ? `${first.title} +${extra}` : first.title;
}

export function momentCountLabel(moment: MusicMoment, locale: Locale = 'en'): string {
  const n = momentSongCount(moment);
  return translate(locale, n === 1 ? 'record.songCount' : 'record.songsCount', { count: n });
}

/** Where a header action lands when the couple hasn't picked a moment. */
export function defaultMoment(moments: MusicMoment[]): MusicMoment | undefined {
  return (
    moments.find((m) => m.isOpenDancing && m.id !== 'do-not-play') ??
    moments.find((m) => m.side === 'B' && m.id !== 'do-not-play') ??
    moments.find((m) => m.id !== 'do-not-play')
  );
}

export type PasteKind = 'search' | 'playlist' | 'youtube' | 'link';

/** Classify a search-field value so a pasted link can use the existing resolvers. */
export function classifyMusicPaste(raw: string): PasteKind {
  const q = raw.trim();
  if (!/^(https?:\/\/|spotify:)/i.test(q)) return 'search';
  if (/youtu\.be\/|youtube\.com\/|music\.youtube\.com\//i.test(q)) return 'youtube';
  if (
    /spotify\.com\/playlist|spotify:playlist/i.test(q) ||
    /music\.apple\.com\/(?:[a-z]{2}\/)?playlist/i.test(q) ||
    /embed\.music\.apple\.com\/[^/]+\/playlist/i.test(q)
  ) {
    return 'playlist';
  }
  return 'link';
}

export function playlistProvider(url: string, tracks: { provider?: string | null }[]): 'apple' | 'spotify' {
  const fromTrack = tracks.find((t) => t.provider === 'apple' || t.provider === 'spotify')?.provider;
  if (fromTrack === 'apple' || fromTrack === 'spotify') return fromTrack;
  return /apple/i.test(url) ? 'apple' : 'spotify';
}
