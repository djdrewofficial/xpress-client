import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PhotoBoothSection } from '@/components/PhotoBoothSection';
import { SongPicker } from '@/components/music/AddMusicSheet';
import { VendorTeam } from '@/components/VendorTeam';
import { MomentBody, type MomentSong, type MomentTab } from '@/components/plan/MomentBody';
import { isDanceFloorSection, momentEyebrow, momentNumber } from '@/components/plan/model';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { resolvePreview } from '@/lib/musicSearch';
import {
  loadOverview,
  loadSection,
  removeSong,
  saveAnswer,
  setMustPlay,
  setSectionTime,
  updateSongNote,
  type QuestionRow,
  type SongRow,
} from '@/lib/planning';
import { supabase } from '@/lib/supabase';
import { TimePickerSheet } from '@/components/TimePickerSheet';

type Meta = {
  title: string;
  icon: string | null;
  intro: string | null;
  songs_enabled: boolean;
  ai_picks_enabled: boolean;
  module: string | null;
  time_label: string | null;
  time_enabled: boolean;
  locked: boolean;
  /** Undefined when the section row has no client_notes column yet. */
  clientNotes?: string | null;
  /** Undefined when the row has no staff_notes column, or the caller is not staff. */
  staffNotes?: string | null;
};

function payloadNote(row: Record<string, unknown> | null, key: string): string | null | undefined {
  if (!row || !(key in row)) return undefined;
  const value = row[key];
  if (typeof value === 'string') return value;
  if (value == null) return null;
  return undefined;
}

export default function SectionScreen() {
  const c = useC();
  const { t, locale } = useT();
  const router = useRouter();
  const { session, profile } = useAuth();
  const { id, eventId, from } = useLocalSearchParams<{ id: string; eventId: string; from?: string }>();
  const backLabel = (Array.isArray(from) ? from[0] : from) || t('moment.backTimeline');

  const [meta, setMeta] = useState<Meta | null>(null);
  const [eventName, setEventName] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [momentNo, setMomentNo] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MomentTab>('questions');
  const sectionKey = Array.isArray(id) ? id[0] : id;
  const [tabSection, setTabSection] = useState(sectionKey);
  if (tabSection !== sectionKey) {
    setTabSection(sectionKey);
    setTab('questions');
    setLoading(true);
  }
  const [picker, setPicker] = useState<null | { mode: 'foryou' | 'search' }>(null);
  const [pickingTime, setPickingTime] = useState(false);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => () => { try { player.pause(); } catch { /* released */ } }, [player]);
  useEffect(() => { if (status.didJustFinish) setPlayingId(null); }, [status.didJustFinish]);

  const load = useCallback(async () => {
    if (!id || !eventId) return;
    const [{ data: m }, { data: ev }, sec, ov] = await Promise.all([
      supabase.from('planning_sections').select('*').eq('id', id).maybeSingle(),
      supabase.from('events').select('name').eq('id', eventId).maybeSingle(),
      loadSection(eventId, id),
      loadOverview(eventId),
    ]);
    const sectionRow = (m ?? null) as Record<string, unknown> | null;
    const nextMeta: Meta = {
      title: m?.title ?? 'Moment',
      icon: m?.icon ?? null,
      intro: m?.intro ?? null,
      songs_enabled: m?.songs_enabled ?? false,
      ai_picks_enabled: m?.ai_picks_enabled ?? false,
      module: m?.module ?? null,
      time_label: m?.time_label ?? null,
      time_enabled: m?.time_enabled ?? false,
      locked: m?.locked ?? false,
      clientNotes: payloadNote(sectionRow, 'client_notes'),
      staffNotes: payloadNote(sectionRow, 'staff_notes'),
    };
    setMeta(nextMeta);
    setEventName(ev?.name ?? '');
    setQuestions(sec.questions);
    setSongs(sec.songs);
    const a: Record<string, string> = {};
    for (const q of sec.questions) a[q.id] = q.answer ?? '';
    setAnswers(a);
    setMomentNo(momentNumber(ov.sections, id));
    setLoading(false);
  }, [id, eventId]);

  useEffect(() => { load(); }, [load]);

  const canManage = profile?.accountType === 'staff' || profile?.accountType === 'client';
  const danceFloor = meta ? isDanceFloorSection(meta) : false;

  function setLocal(qid: string, v: string) {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
  }
  async function persist(qid: string, v: string) {
    if (!session?.user.id) return;
    const ok = await saveAnswer(eventId, qid, v, session.user.id);
    if (!ok) Alert.alert(t('common.couldntSave'), t('moment.saveFailBody'));
  }
  function pick(qid: string, v: string) {
    setLocal(qid, v);
    persist(qid, v);
  }

  const failed = () => Alert.alert(t('common.couldntSave'), t('common.checkConnection'));

  const onToggleMust = async (song: MomentSong) => {
    const current = songs.find((s) => s.id === song.id);
    if (!current) return;
    const v = !current.must_play;
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, must_play: v, do_not_play: v ? false : s.do_not_play } : s)));
    if (!(await setMustPlay(song.id, v))) {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? current : s)));
      failed();
    }
  };

  const onRemove = async (song: MomentSong) => {
    setSongs((prev) => prev.filter((s) => s.id !== song.id));
    if (!(await removeSong(song.id))) {
      failed();
      load();
    }
  };

  const onSaveNote = async (song: MomentSong, note: string) => {
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, note: note.trim() || null } : s)));
    if (!(await updateSongNote(song.id, note))) { failed(); load(); }
  };

  const onPlay = async (song: MomentSong) => {
    if (playingId === song.id) { try { player.pause(); } catch { /* noop */ } setPlayingId(null); return; }
    const row = songs.find((s) => s.id === song.id);
    let url = song.previewUrl ?? row?.preview_url ?? null;
    if (!url) url = await resolvePreview(song.title, song.artist ?? '');
    if (!url) { setPlayingId(null); return; }
    try { player.replace({ uri: url }); player.seekTo(0); player.play(); setPlayingId(song.id); } catch { setPlayingId(null); }
  };

  const saveTime = async (time: string | null) => {
    setPickingTime(false);
    if (!meta) return;
    setMeta({ ...meta, time_label: time });
    if (!(await setSectionTime(eventId, id, time))) {
      Alert.alert(t('moment.timeFail'), t('common.tryAgain'));
      load();
    }
  };

  if (loading || !meta) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.accent} /></View>;
  }

  const special = meta.module === 'photobooth'
    ? <PhotoBoothSection eventId={eventId} />
    : meta.module === 'vendors'
      ? <VendorTeam eventId={eventId} />
      : null;

  const momentSongs = songs.map(toMoment);
  const songTotal = danceFloor ? momentSongs.filter((s) => !s.doNotPlay).length : songs.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <MomentBody
        backLabel={backLabel}
        onBack={() => router.back()}
        eyebrow={momentEyebrow(momentNo, meta.time_label, locale)}
        onEyebrow={canManage && meta.time_enabled && !meta.locked ? () => setPickingTime(true) : undefined}
        title={meta.title}
        icon={meta.icon}
        intro={meta.intro}
        tab={tab}
        onTab={setTab}
        questions={questions}
        answers={answers}
        onChange={setLocal}
        onPersist={persist}
        onPick={pick}
        songs={momentSongs}
        isDanceFloor={danceFloor}
        songCount={songTotal}
        songsEnabled={meta.songs_enabled}
        aiPicks={meta.ai_picks_enabled}
        onAddMusic={() => setPicker({ mode: 'search' })}
        onForYou={() => setPicker({ mode: 'foryou' })}
        onToggleMust={onToggleMust}
        onRemove={onRemove}
        onSaveNote={onSaveNote}
        onPlay={onPlay}
        playingId={playingId}
        special={special}
        sectionId={Array.isArray(id) ? id[0] : id}
        isStaff={profile?.accountType === 'staff'}
        notesReadOnly={profile?.accountType === 'event_guest'}
        initialNotes={meta.clientNotes}
        initialStaffNotes={profile?.accountType === 'staff' ? meta.staffNotes : undefined}
      />
      <SongPicker
        visible={picker !== null}
        mode={picker?.mode ?? 'search'}
        onClose={() => setPicker(null)}
        eventId={eventId}
        eventName={eventName}
        sectionId={id}
        sectionTitle={meta.title}
        existingTitles={new Set(songs.map((s) => s.title.toLowerCase()))}
        onAdded={(row) => {
          setSongs((prev) => (prev.some((s) => s.id === row.id) ? prev : [...prev, row]));
        }}
        onReload={load}
      />
      <TimePickerSheet
        visible={pickingTime}
        initial={meta.time_label}
        title={t('moment.timeTitle', { title: meta.title })}
        onClose={() => setPickingTime(false)}
        onSave={saveTime}
      />
    </View>
  );
}

function toMoment(s: SongRow): MomentSong {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    mustPlay: s.must_play,
    doNotPlay: s.do_not_play,
    note: s.note,
    provider: s.provider,
    previewUrl: s.preview_url,
  };
}
