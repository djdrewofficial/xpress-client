import { onMusic, onTimeline, type EventSong, type Group, type SectionRow } from '@/lib/planning';

export type RecordTrack = {
  id: string;
  title: string;
  artist: string | null;
  mustPlay: boolean;
  doNotPlay: boolean;
  note: string | null;
};

export type MusicMoment = {
  id: string;
  side: 'A' | 'B';
  index: number;
  title: string;
  isOpenDancing: boolean;
  /** Playable songs, in playlist order. */
  tracks: RecordTrack[];
  /** Do-not-play songs. Only the Open Dancing moment carries these. */
  doNotPlay: RecordTrack[];
};

export type MusicStats = {
  songs: number;
  moments: number;
  mustPlay: number;
  doNotPlay: number;
};

/** Open-dancing playlist (the only place Do not play is shown). */
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
  if (isDoNotPlaySectionTitle(section.title)) return false;
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
  };
}

/**
 * Fold the plan into a two-sided record.
 * Do-not-play songs (flagged, or living on a Do not play section) are pulled off
 * their moment and listed only under Open Dancing.
 */
export function buildMusicRecord(groups: Group[], songs: EventSong[]): MusicMoment[] {
  const bySection = new Map<string, EventSong[]>();
  for (const song of songs) {
    const list = bySection.get(song.section_id) ?? [];
    list.push(song);
    bySection.set(song.section_id, list);
  }

  const dnpSectionIds = new Set<string>();
  for (const group of groups) {
    for (const section of group.sections) {
      if (isDoNotPlaySectionTitle(section.title)) dnpSectionIds.add(section.id);
    }
  }

  const seen = new Set<string>();
  const dnpTracks: RecordTrack[] = [];
  for (const song of songs) {
    if (!song.do_not_play && !dnpSectionIds.has(song.section_id)) continue;
    if (seen.has(song.id)) continue;
    seen.add(song.id);
    dnpTracks.push(toTrack(song, true));
  }

  type Draft = { id: string; side: 'A' | 'B'; title: string; isOpenDancing: boolean; tracks: RecordTrack[] };
  const drafts: Draft[] = [];
  let openId: string | null = null;

  for (const group of groups) {
    for (const section of group.sections) {
      if (dnpSectionIds.has(section.id)) continue;
      const sectionSongs = bySection.get(section.id) ?? [];
      if (!includeSection(group.title, section, sectionSongs.length > 0)) continue;
      const isOpen = isOpenDancingTitle(section.title);
      if (isOpen && !openId) openId = section.id;
      drafts.push({
        id: section.id,
        side: sideFor(group.title, section.title),
        title: section.title,
        isOpenDancing: isOpen,
        tracks: sectionSongs.filter((s) => !s.do_not_play).map((s) => toTrack(s, false)),
      });
    }
  }

  const ordered = [...drafts.filter((d) => d.side === 'A'), ...drafts.filter((d) => d.side === 'B')];
  const counts = { A: 0, B: 0 };
  const moments: MusicMoment[] = ordered.map((draft) => {
    counts[draft.side] += 1;
    return {
      id: draft.id,
      side: draft.side,
      index: counts[draft.side],
      title: draft.title,
      isOpenDancing: draft.isOpenDancing,
      tracks: draft.tracks,
      doNotPlay: draft.id === openId ? dnpTracks : [],
    };
  });

  if (!openId && dnpTracks.length > 0) {
    counts.B += 1;
    moments.push({
      id: 'do-not-play',
      side: 'B',
      index: counts.B,
      title: 'Open Dancing',
      isOpenDancing: true,
      tracks: [],
      doNotPlay: dnpTracks,
    });
  }

  return moments;
}

export function musicStats(moments: MusicMoment[]): MusicStats {
  const tracks = moments.flatMap((m) => m.tracks);
  const doNotPlay = moments.reduce((n, m) => n + m.doNotPlay.length, 0);
  return {
    songs: tracks.length + doNotPlay,
    moments: moments.length,
    mustPlay: tracks.filter((t) => t.mustPlay).length,
    doNotPlay,
  };
}

export function momentSongCount(moment: MusicMoment): number {
  return moment.tracks.length + moment.doNotPlay.length;
}

/** One-line subtitle under a moment title, matching the record layout. */
export function momentSubtitle(moment: MusicMoment): string {
  const must = moment.tracks.filter((t) => t.mustPlay).length;
  if (moment.isOpenDancing && (must > 0 || moment.doNotPlay.length > 0)) {
    return `${must} must play · ${moment.doNotPlay.length} do not play`;
  }
  const first = moment.tracks[0];
  if (!first) return 'No song yet';
  const extra = moment.tracks.length - 1;
  return extra > 0 ? `${first.title} +${extra}` : first.title;
}

export function momentCountLabel(moment: MusicMoment): string {
  const n = momentSongCount(moment);
  return `${n} song${n === 1 ? '' : 's'}`;
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
