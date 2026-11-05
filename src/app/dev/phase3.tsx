import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { EventSwitchList } from '@/components/EventSwitcher';
import { GroupBody } from '@/components/plan/GroupBody';
import { HomeBody } from '@/components/plan/HomeBody';
import { MomentBody, type MomentSong, type MomentTab } from '@/components/plan/MomentBody';
import { NewMomentForm, type Suggestion } from '@/components/plan/NewMomentForm';
import { TabBar, ThemeSchemeOverride, useC } from '@/components/ui';
import type { IconName } from '@/components/ui';
import type { QuestionRow } from '@/lib/planning';
import { formatEventEyebrow } from '@/lib/eventDate';
import { useT } from '@/lib/i18n';
import { useDevLocale } from '@/lib/devLocale';
import { Fonts } from '@/lib/theme';

/**
 * Dev-only sample frames for the Home / Moments phase. Not linked from the app.
 * Open /dev/phase3?shot=home (and the other shot ids below).
 */
const SHOTS = ['home', 'home-dark', 'group', 'questions', 'songs', 'dancing', 'notes', 'new-moment', 'switcher'] as const;

export default function Phase3Preview() {
  const c = useC();
  useDevLocale();
  const { shot } = useLocalSearchParams<{ shot?: string }>();
  if (!__DEV__) return <Redirect href="/login" />;
  const which = Array.isArray(shot) ? shot[0] : shot;
  if (!which) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 24, gap: 12 }}>
        <Text style={{ fontFamily: Fonts.display, fontSize: 32, color: c.ink }}>Phase 3 samples</Text>
        {SHOTS.map((id) => (
          <Text key={id} style={{ color: c.accent, fontSize: 18 }}>{`/dev/phase3?shot=${id}`}</Text>
        ))}
      </ScrollView>
    );
  }
  return <Shot id={which} />;
}

function Shot({ id }: { id: string }) {
  if (id === 'home-dark') {
    return (
      <ThemeSchemeOverride scheme="dark">
        <Frame tab="home">
          <SampleHome />
        </Frame>
      </ThemeSchemeOverride>
    );
  }
  if (id === 'home') {
    return <Frame tab="home"><SampleHome /></Frame>;
  }
  if (id === 'group') return <Frame tab="home"><SampleGroup /></Frame>;
  if (id === 'questions') return <SampleMoment initial="questions" />;
  if (id === 'songs') return <SampleMoment initial="songs" />;
  if (id === 'dancing') return <SampleMoment initial="songs" dancing />;
  if (id === 'notes') return <SampleMoment initial="notes" />;
  if (id === 'new-moment') return <SampleNewMoment />;
  if (id === 'switcher') return <SampleSwitcher />;
  return null;
}

function Frame({ tab, children }: { tab: string; children: ReactNode }) {
  const c = useC();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}>{children}</View>
      <TabBar active={tab} />
    </View>
  );
}

function SampleHome() {
  const { t, locale } = useT();
  return (
    <HomeBody
      greeting={`${t('home.greetEvening')}, SAMPLE`}
      eventName="Sample & Couple"
      date="2027-06-13"
      dateLabel={formatEventEyebrow('2027-06-13', locale)}
      venue="Sample Venue"
      progress={43}
      canSwitch
      onSwitch={() => {}}
      resume={{ icon: 'mic', title: 'Grand Entrance', meta: `${t('home.questionsLeft', { count: 3 })} · Reception, 5:30 PM` }}
      onContinue={() => {}}
      chapters={[
        { id: '1', index: 1, title: 'Ceremony', moments: 4, status: t('home.done'), done: true },
        { id: '2', index: 2, title: 'Cocktail hour', moments: 3, status: t('home.of', { answered: 3, total: 5 }), done: false },
        { id: '3', index: 3, title: 'Reception', moments: 9, status: t('home.of', { answered: 2, total: 8 }), done: false },
      ]}
      onChapter={() => {}}
      onSeeAll={() => {}}
    />
  );
}

const QUESTIONS: QuestionRow[] = [
  { id: 'q1', prompt: 'How would you like to be announced?', help_text: null, answer_type: 'short', options: [], answer: 'Mr. & Mrs. Sample', condition_question_id: null, condition_values: [], updated_at: '2026-11-03T12:00:00Z' },
  { id: 'q2', prompt: 'Should the wedding party come in first?', help_text: null, answer_type: 'yesno', options: [], answer: 'Yes, in pairs', condition_question_id: null, condition_values: [], updated_at: '2026-11-03T12:00:00Z' },
  { id: 'q3', prompt: 'Anything we should know about your entrance?', help_text: 'Props, sparklers, a special cue. Tell us.', answer_type: 'long', options: [], answer: null, condition_question_id: null, condition_values: [] },
  { id: 'q4', prompt: 'How hyped should the entrance be?', help_text: null, answer_type: 'scale', options: [], answer: null, condition_question_id: null, condition_values: [] },
  { id: 'q5', prompt: 'Do you want a special song cue?', help_text: null, answer_type: 'yesno', options: [], answer: null, condition_question_id: null, condition_values: [] },
];

const SONGS: MomentSong[] = [
  { id: 's1', title: 'Sample Entrance Anthem', artist: 'Sample Artist', mustPlay: true, doNotPlay: false, note: 'Doors open on the first chorus. Fade the intro.', provider: 'spotify' },
  { id: 's2', title: 'Sample Backup Song', artist: 'Sample Band', mustPlay: false, doNotPlay: false, note: null, provider: 'apple' },
];

const FLOOR: MomentSong[] = [
  { id: 'f1', title: 'Sample Floor Filler', artist: 'Sample Artist', mustPlay: true, doNotPlay: false, note: null },
  { id: 'f2', title: 'Sample Throwback', artist: 'Sample Crew', mustPlay: false, doNotPlay: false, note: null },
  { id: 'f3', title: 'Sample Third Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: false, note: null },
  { id: 'f4', title: 'Sample Fourth Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: false, note: null },
  { id: 'f5', title: 'Sample Fifth Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: false, note: null },
  { id: 'f6', title: 'Sample Sixth Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: false, note: null },
];

const AVOID: MomentSong[] = [
  { id: 'd1', title: 'Sample Overplayed Song', artist: 'Sample Artist', mustPlay: false, doNotPlay: true, note: null },
  { id: 'd2', title: 'Sample Line Dance', artist: 'Sample Band', mustPlay: false, doNotPlay: true, note: null },
];

function SampleMoment({ initial, dancing }: { initial: MomentTab; dancing?: boolean }) {
  const { t } = useT();
  const [tab, setTab] = useState<MomentTab>(initial);
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: 'Mr. & Mrs. Sample',
    q2: 'Yes, in pairs',
    q3: '',
    q4: '',
    q5: '',
  });
  const songs = dancing ? FLOOR : SONGS;
  return (
    <MomentBody
      backLabel={t('tab.timeline')}
      onBack={() => {}}
      eyebrow={dancing ? `${t('moment.eyebrowN', { n: '12' })}  ·  8:00 PM` : `${t('moment.eyebrowN', { n: '04' })}  ·  5:30 PM`}
      title={dancing ? 'Open Dancing' : 'Grand Entrance'}
      icon={dancing ? 'disco' : 'mic'}
      tab={tab}
      onTab={setTab}
      questions={dancing ? QUESTIONS.slice(0, 2) : QUESTIONS}
      answers={dancing ? { q1: 'High energy', q2: '' } : answers}
      onChange={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
      onPersist={() => {}}
      onPick={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
      songs={songs}
      doNotPlaySongs={dancing ? AVOID : []}
      isDanceFloor={!!dancing}
      isAvoidList={false}
      danceTitle={dancing ? null : 'Open Dancing'}
      onOpenDance={() => {}}
      songCount={dancing ? 18 : 2}
      songsEnabled
      aiPicks={false}
      onAddMusic={() => {}}
      onForYou={() => {}}
      onAddDoNotPlay={() => {}}
      onToggleMust={() => {}}
      onRemove={() => {}}
      onSaveNote={() => {}}
      onPlay={() => {}}
      playingId={null}
    />
  );
}

const SUGGESTIONS: Suggestion[] = [
  { id: '1', title: 'Late night snack', icon: 'cake' },
  { id: '2', title: 'Sparkler exit', icon: 'sparkles' },
  { id: '3', title: 'Anniversary dance', icon: 'heart' },
  { id: '4', title: 'Shoe game', icon: 'sparkle' },
  { id: '5', title: 'Photo moment', icon: 'camera' },
];

function SampleNewMoment() {
  const c = useC();
  const [selected, setSelected] = useState<string | null>('1');
  const [name, setName] = useState('Sample Late Night Snack');
  const [icon, setIcon] = useState<IconName>('cake');
  const [groupId, setGroupId] = useState('reception');
  const [time, setTime] = useState<string | null>('10:30 PM');
  const [notes, setNotes] = useState('');
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(18,12,30,0.45)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 22 }}>
        <NewMomentForm
          suggestions={SUGGESTIONS}
          selectedId={selected}
          onSelectSuggestion={(s) => { setSelected(s.id); setName(s.title === 'Late night snack' ? 'Sample Late Night Snack' : s.title); setIcon((s.icon as IconName) || 'sparkles'); }}
          name={name}
          onName={(v) => { setName(v); setSelected(null); }}
          icon={icon}
          onIcon={setIcon}
          groups={[{ id: 'ceremony', title: 'Ceremony' }, { id: 'cocktail', title: 'Cocktail' }, { id: 'reception', title: 'Reception' }]}
          groupId={groupId}
          onGroup={setGroupId}
          timeLabel={time}
          onPickTime={() => setTime(time ? null : '10:30 PM')}
          notes={notes}
          onNotes={setNotes}
          onSubmit={() => {}}
        />
      </View>
    </View>
  );
}

function SampleSwitcher() {
  return (
    <View style={{ flex: 1 }}>
      <SampleHome />
      <View style={{ ...absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 }}>
          <EventSwitchList
            eventId="a"
            events={[
              { id: 'a', name: 'Sample & Couple', event_date: '2027-06-13', cover_photo_url: null },
              { id: 'b', name: 'Sample Anniversary', event_date: '2027-11-02', cover_photo_url: null },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function SampleGroup() {
  return (
    <GroupBody
      title="Reception"
      subtitle="9 moments · 2 of 8"
      onBack={() => {}}
      canManage
      editing={false}
      onToggleEdit={() => {}}
      moments={[
        { id: '1', title: 'Grand Entrance', icon: 'mic', time: '5:30 PM', meta: '2 songs', badge: '2/5' },
        { id: '2', title: 'First Dance', icon: 'first-dance', time: '5:45 PM', meta: '1 song', badge: '1/4' },
        { id: '3', title: 'Cake Cutting', icon: 'cake', time: null, meta: 'No songs', badge: '0/3' },
      ]}
      onOpen={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onAdd={() => {}}
      removed={[]}
      onRestore={() => {}}
    />
  );
}

const absoluteFill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };
