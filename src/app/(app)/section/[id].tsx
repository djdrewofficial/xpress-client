import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafetyLinks } from '@/components/moderation/SafetyLinks';
import { useModeration } from '@/components/moderation/useModeration';
import { PhotoBoothSection } from '@/components/PhotoBoothSection';
import { SongPicker } from '@/components/music/AddMusicSheet';
import { VendorTeam } from '@/components/VendorTeam';
import { MomentBody, type MomentSong, type MomentTab } from '@/components/plan/MomentBody';
import { isDanceFloorSection, momentEyebrow, momentNumber } from '@/components/plan/model';
import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isDoNotPlayTitle, sectionClosedToGuest } from '@/lib/guestSections';
import { useT } from '@/lib/i18n';
import { noteSeedFromFeed } from '@/lib/moderatedDisplay';
import { hideContent, loadEventContent } from '@/lib/moderation';
import { managesEvent, roleForEvent } from '@/lib/membership';
import { resolvePreview } from '@/lib/musicSearch';
import {
  loadMyLikes,
  loadOverview,
  loadSection,
  saveAnswer,
  setMustPlay,
  setSectionTime,
  setSongLiked,
  updateSongNote,
  type QuestionRow,
  type SongRow,
} from '@/lib/planning';
import { supabase } from '@/lib/supabase';
import { Type } from '@/lib/theme';
import { TimePickerSheet } from '@/components/TimePickerSheet';

type Meta = {
  title: string;
  icon: string | null;
  intro: string | null;
  songs_enabled: boolean;
  module: string | null;
  time_label: string | null;
  time_enabled: boolean;
  locked: boolean;
};

export default function SectionScreen() {
  const c = useC();
  const { t, locale } = useT();
  const router = useRouter();
  const { session, profile } = useAuth();
  const { id, eventId, from } = useLocalSearchParams<{ id: string; eventId: string; from?: string }>();
  const backLabel = (Array.isArray(from) ? from[0] : from) || t('moment.backTimeline');

  const [meta, setMeta] = useState<Meta | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [likePeople, setLikePeople] = useState<Record<string, { userId: string; label: string | null }[]>>({});
  const [songLabels, setSongLabels] = useState<Record<string, string | null>>({});
  const [answerAuthors, setAnswerAuthors] = useState<Record<string, string | null>>({});
  const [answerLabels, setAnswerLabels] = useState<Record<string, string | null>>({});
  const [noteAuthorId, setNoteAuthorId] = useState<string | null>(null);
  const [noteAuthorLabel, setNoteAuthorLabel] = useState<string | null>(null);
  const [noteSeed, setNoteSeed] = useState<{ skipLoad: boolean; text: string | null }>({ skipLoad: false, text: null });
  const [boothAuthor, setBoothAuthor] = useState<{ userId: string; label: string | null } | null>(null);
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
  const [closed, setClosed] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickingTime, setPickingTime] = useState(false);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => () => { try { player.pause(); } catch { /* released */ } }, [player]);
  useEffect(() => { if (status.didJustFinish) setPlayingId(null); }, [status.didJustFinish]);

  const load = useCallback(async () => {
    if (!id || !eventId) return;
    const guest = roleForEvent(eventId) === 'guest';
    const [{ data: m }, sec, ov] = await Promise.all([
      supabase.from('planning_sections').select('id, title, icon, intro, songs_enabled, module, time_label, time_enabled, locked, guest_enabled').eq('id', id).maybeSingle(),
      loadSection(eventId, id),
      loadOverview(eventId),
    ]);
    const sectionRow = (m ?? null) as (Record<string, unknown> & { title?: string | null; guest_enabled?: boolean | null }) | null;
    if (guest && (sectionClosedToGuest(sectionRow) || isDoNotPlayTitle(sectionRow?.title ?? '') || !ov.sections.some((section) => section.id === id))) {
      setClosed(true);
      setLoading(false);
      return;
    }
    setClosed(false);
    const nextMeta: Meta = {
      title: m?.title ?? 'Moment',
      icon: m?.icon ?? null,
      intro: m?.intro ?? null,
      songs_enabled: m?.songs_enabled ?? false,
      module: m?.module ?? null,
      time_label: m?.time_label ?? null,
      time_enabled: m?.time_enabled ?? false,
      locked: m?.locked ?? false,
    };
    setMeta(nextMeta);
    setQuestions(sec.questions);
    const visibleSongs = guest ? sec.songs.filter((song) => !song.do_not_play) : sec.songs;
    setSongs(visibleSongs);
    if (session?.user.id) {
      loadMyLikes(visibleSongs.map((song) => song.id), session.user.id).then(setLikes).catch(() => setLikes(new Set()));
    } else {
      setLikes(new Set());
    }
    const a: Record<string, string> = {};
    for (const q of sec.questions) a[q.id] = q.answer ?? '';
    setAnswers(a);
    setMomentNo(momentNumber(ov.sections, id));
    const sectionKey = Array.isArray(id) ? id[0] : id;
    const feed = await loadEventContent(eventId);
    if (feed.ok) {
      const bySong: Record<string, { userId: string; label: string | null }[]> = {};
      for (const like of feed.data.likes) {
        if (like.hidden) continue;
        (bySong[like.songId] ??= []).push({ userId: like.userId, label: like.label });
      }
      const authors: Record<string, string | null> = {};
      const authorLabels: Record<string, string | null> = {};
      for (const answer of feed.data.answers) {
        if (answer.hidden) continue;
        authors[answer.questionId] = answer.answeredBy;
        authorLabels[answer.questionId] = answer.answeredByLabel;
      }
      const labels: Record<string, string | null> = {};
      for (const song of feed.data.songs) labels[song.id] = song.requestedByLabel;
      const note = feed.data.sectionNotes.find((item) => item.sectionId === sectionKey) ?? null;
      const showAuthor = !!note && (!note.hidden || !!note.notes);
      setLikePeople(bySong);
      setSongLabels(labels);
      setAnswerAuthors(authors);
      setAnswerLabels(authorLabels);
      setNoteSeed(noteSeedFromFeed({
        ok: true,
        note: note ? { notes: note.notes, hidden: note.hidden } : null,
      }));
      setNoteAuthorId(showAuthor ? note?.updatedBy ?? null : null);
      setNoteAuthorLabel(showAuthor ? note?.updatedByLabel ?? null : null);
      const booth = feed.data.boothSelection;
      setBoothAuthor(booth && !booth.hidden && booth.updatedBy
        ? { userId: booth.updatedBy, label: booth.updatedByLabel }
        : null);
    } else {
      setNoteSeed(noteSeedFromFeed({ ok: false }));
      setNoteAuthorId(null);
      setNoteAuthorLabel(null);
    }
    setLoading(false);
  }, [id, eventId, session?.user.id]);

  useEffect(() => { load(); }, [load]);

  const guest = roleForEvent(eventId) === 'guest';
  const canManage = managesEvent({ id: eventId, role: guest ? 'guest' : null }, profile?.accountType);
  const danceFloor = meta ? isDanceFloorSection(meta) : false;

  async function toggleLike(song: { id: string }) {
    if (!session?.user.id) return;
    const next = !likes.has(song.id);
    setLikes((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(song.id);
      else copy.delete(song.id);
      return copy;
    });
    const ok = await setSongLiked(song.id, session.user.id, next);
    if (!ok) {
      setLikes((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(song.id);
        else copy.add(song.id);
        return copy;
      });
      Alert.alert(t('common.couldntSave'), t('guest.closed'));
    }
  }

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
  const moderation = useModeration(eventId, () => { void load(); });

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

  const onRemove = (song: MomentSong) => {
    Alert.alert(t('safety.confirmHideTitle'), t('safety.confirmHideBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('moment.removeSong'),
        style: 'destructive',
        onPress: () => { void hideSong(song); },
      },
    ]);
  };

  const hideSong = async (song: MomentSong) => {
    const hidden = await hideContent(eventId, { targetType: 'song', targetId: song.id });
    if (!hidden.ok) {
      Alert.alert(t(hidden.kind === 'unavailable'
        ? 'safety.unavailable'
        : hidden.kind === 'ownOnly'
          ? 'safety.ownOnly'
          : hidden.kind === 'guestOnly'
            ? 'safety.guestOnly'
            : hidden.kind === 'forbidden'
              ? 'safety.forbidden'
              : hidden.kind === 'notFound'
                ? 'safety.notFound'
                : 'safety.failed'));
      return;
    }
    setSongs((prev) => prev.filter((s) => s.id !== song.id));
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

  if (closed) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={[Type.body, { color: c.ink, textAlign: 'center' }]}>{t('guest.closed')}</Text>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  if (loading || !meta) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.accent} /></View>;
  }

  const userId = session?.user.id ?? null;
  const special = meta.module === 'photobooth'
    ? (
      <PhotoBoothSection
        eventId={eventId}
        safety={(
          <SafetyLinks
            reportLabel={t('safety.reportBooth')}
            onReport={() => moderation.openReport({ targetType: 'booth_selection', targetId: eventId })}
            hideLabel={t('safety.remove')}
            onHide={() => moderation.askHide({ targetType: 'booth_selection', targetId: eventId })}
            blockLabel={boothAuthor && boothAuthor.userId !== userId
              ? (boothAuthor.label ? t('safety.blockNamed', { name: boothAuthor.label }) : t('safety.block'))
              : undefined}
            onBlock={boothAuthor && boothAuthor.userId !== userId
              ? () => moderation.askBlock(boothAuthor.userId, boothAuthor.label)
              : undefined}
            guestLabel={canManage && boothAuthor && boothAuthor.userId !== userId
              ? (boothAuthor.label ? t('safety.removeGuestNamed', { name: boothAuthor.label }) : t('safety.removeGuest'))
              : undefined}
            onRemoveGuest={canManage && boothAuthor && boothAuthor.userId !== userId
              ? () => moderation.askRemoveGuest(boothAuthor.userId, boothAuthor.label)
              : undefined}
          />
        )}
      />
    )
    : meta.module === 'vendors'
      ? <VendorTeam eventId={eventId} />
      : null;

  const momentSongs = songs.map((song) => toMoment(
    song,
    likes.has(song.id),
    userId,
    likePeople[song.id] ?? [],
    songLabels[song.id] ?? null,
  ));
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
        onAddMusic={() => setPicker(true)}
        onToggleMust={onToggleMust}
        onRemove={onRemove}
        onSaveNote={onSaveNote}
        onPlay={onPlay}
        playingId={playingId}
        special={special}
        sectionId={Array.isArray(id) ? id[0] : id}
        isStaff={profile?.accountType === 'staff'}
        guestMode={guest}
        onToggleLike={toggleLike}
        notesReadOnly={false}
        initialNotes={noteSeed.skipLoad ? noteSeed.text : undefined}
        safety={{
          userId,
          canManage,
          noteAuthorId,
          noteAuthorLabel,
          answerAuthors,
          answerLabels,
          onReport: moderation.openReport,
          onBlock: moderation.askBlock,
          onHide: moderation.askHide,
          onRemoveGuest: moderation.askRemoveGuest,
        }}
      />
      <SongPicker
        visible={picker}
        onClose={() => setPicker(false)}
        eventId={eventId}
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
      {moderation.sheet}
    </View>
  );
}

function toMoment(
  s: SongRow,
  liked: boolean,
  userId: string | null,
  likePeople: { userId: string; label: string | null }[],
  requestedByLabel: string | null,
): MomentSong {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    mustPlay: s.must_play,
    doNotPlay: s.do_not_play,
    note: s.note,
    provider: s.provider,
    previewUrl: s.preview_url,
    liked,
    mine: !!userId && s.requested_by === userId,
    requestedBy: s.requested_by ?? null,
    requestedByLabel,
    likePeople,
  };
}
