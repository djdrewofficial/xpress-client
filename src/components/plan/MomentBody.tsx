import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  EmojiIcon,
  Icon,
  NavBar,
  SegmentedControl,
  Sheet,
  TrackRow,
  useC,
} from '@/components/ui';
import { useT } from '@/lib/i18n';
import { questionVisible, type QuestionRow } from '@/lib/planning';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { answerText, composeDjNote } from './model';

export type MomentTab = 'questions' | 'songs' | 'notes';

export type MomentSong = {
  id: string;
  title: string;
  artist: string | null;
  mustPlay: boolean;
  doNotPlay: boolean;
  note: string | null;
  provider?: string | null;
  previewUrl?: string | null;
};

type Tab = MomentTab;

/**
 * One moment: Questions, Music, and DJ notes.
 * DJ notes only reads answers and song notes that already exist.
 */
export function MomentBody({
  backLabel,
  onBack,
  eyebrow,
  onEyebrow,
  title,
  icon,
  tab,
  onTab,
  questions,
  answers,
  onChange,
  onPersist,
  onPick,
  songs,
  doNotPlaySongs,
  isDanceFloor,
  isAvoidList,
  danceTitle,
  onOpenDance,
  songCount,
  songsEnabled,
  aiPicks,
  onAddMusic,
  onForYou,
  onAddDoNotPlay,
  onToggleMust,
  onRemove,
  onSaveNote,
  onPlay,
  playingId,
  special,
  intro,
}: {
  backLabel: string;
  onBack: () => void;
  eyebrow: string;
  onEyebrow?: () => void;
  title: string;
  icon: string | null;
  tab: Tab;
  onTab: (tab: Tab) => void;
  questions: QuestionRow[];
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onPersist: (id: string, value: string) => void;
  onPick: (id: string, value: string) => void;
  songs: MomentSong[];
  doNotPlaySongs: MomentSong[];
  isDanceFloor: boolean;
  isAvoidList: boolean;
  danceTitle: string | null;
  onOpenDance?: () => void;
  songCount: number;
  songsEnabled: boolean;
  aiPicks: boolean;
  onAddMusic: () => void;
  onForYou: () => void;
  onAddDoNotPlay: () => void;
  onToggleMust: (song: MomentSong) => void;
  onRemove: (song: MomentSong) => void;
  onSaveNote: (song: MomentSong, note: string) => void;
  onPlay: (song: MomentSong) => void;
  playingId: string | null;
  special?: ReactNode;
  intro?: string | null;
}) {
  const c = useC();
  const { t, locale } = useT();
  const insets = useSafeAreaInsets();
  const [editingAll, setEditingAll] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [reeditId, setReeditId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MomentSong | null>(null);
  const [noteFor, setNoteFor] = useState<MomentSong | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showAllMust, setShowAllMust] = useState(false);

  const visible = useMemo(() => questions.filter((q) => questionVisible(q, answers)), [questions, answers]);
  const answeredCount = visible.filter((q) => (answers[q.id] ?? '').trim() !== '').length;
  const activeId = editingAll
    ? null
    : reeditId && visible.some((q) => q.id === reeditId)
      ? reeditId
      : (visible.find((q) => q.id === focusId && !(answers[q.id] ?? '').trim())?.id ??
        visible.find((q) => !(answers[q.id] ?? '').trim())?.id ??
        null);

  const dj = composeDjNote(visible, answers, locale);
  const songNotes = [...songs, ...doNotPlaySongs].filter((s) => (s.note ?? '').trim());

  // Avoid-list sections store the do-not-play rows. Everywhere else, flagged rows split out.
  const ownMust = isAvoidList ? [] : songs.filter((s) => !s.doNotPlay);
  const ownAvoid = isAvoidList ? songs : songs.filter((s) => s.doNotPlay);
  const avoid = dedupe([...ownAvoid, ...doNotPlaySongs]);
  const showSplit = isDanceFloor || isAvoidList;
  const mustShown = showAllMust || ownMust.length <= 2 ? ownMust : ownMust.slice(0, 2);

  function saveAndContinue() {
    if (!editingAll && activeId) onPersist(activeId, answers[activeId] ?? '');
    setReeditId(null);
    const next = visible.find((q) => q.id !== activeId && !(answers[q.id] ?? '').trim());
    if (next) setFocusId(next.id);
    else if (songsEnabled || songs.length > 0) onTab('songs');
  }

  const bottom =
    special || tab === 'notes'
      ? null
      : tab === 'questions'
        ? visible.length > 0
          ? { label: t('moment.saveContinue'), arrow: true as const, onPress: saveAndContinue }
          : null
        : songsEnabled
          ? { label: t('moment.addMusic'), arrow: false as const, onPress: onAddMusic }
          : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
        <NavBar
          title={backLabel}
          onBack={onBack}
          trailing={
            !special && tab === 'questions' && visible.length > 0
              ? { label: editingAll ? t('common.done') : t('common.edit'), onPress: () => { setEditingAll((e) => !e); setReeditId(null); } }
              : undefined
          }
        />
      </SafeAreaView>

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom ? 24 : 48, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View style={styles.identity}>
          <View style={[styles.iconBox, { backgroundColor: c.accentTint }]}>
            <EmojiIcon glyph={icon} size={26} color={c.accent} fallback={isDanceFloor ? 'disco' : 'mic'} />
          </View>
          <View style={{ flex: 1 }}>
            <Pressable onPress={onEyebrow} disabled={!onEyebrow} hitSlop={6}>
              <Text style={[Type.label, { color: c.red }]}>{eyebrow}</Text>
            </Pressable>
            <Text style={[styles.momentTitle, { color: c.ink }]}>{title}</Text>
          </View>
        </View>
        {intro ? <Text style={[Type.footnote, { color: c.ink2 }]}>{intro}</Text> : null}

        {special ? (
          special
        ) : (
          <>
            <SegmentedControl
              options={[
                { value: 'questions' as const, label: visible.length ? t('moment.questionsCount', { answered: answeredCount, total: visible.length }) : t('moment.questions') },
                { value: 'songs' as const, label: t('moment.songsCount', { count: songCount }) },
                { value: 'notes' as const, label: t('moment.djNotes') },
              ]}
              value={tab}
              onChange={onTab}
            />

            {tab === 'questions' ? (
              <QuestionPane
                visible={visible}
                answers={answers}
                activeId={activeId}
                editingAll={editingAll}
                onChange={onChange}
                onPersist={onPersist}
                onPick={onPick}
                onFocus={(id) => { setEditingAll(false); setReeditId(id); setFocusId(id); }}
              />
            ) : null}

            {tab === 'songs' ? (
              <View style={{ gap: 14 }}>
                {showSplit ? (
                  <DanceLists
                    must={mustShown}
                    mustTotal={ownMust.length}
                    expanded={showAllMust || ownMust.length <= 2}
                    onToggleExpand={() => setShowAllMust((v) => !v)}
                    avoid={avoid}
                    onSong={setMenu}
                    onRemove={onRemove}
                    onAddDoNotPlay={songsEnabled ? onAddDoNotPlay : undefined}
                    noteFor={noteFor}
                    noteDraft={noteDraft}
                    onNoteDraft={setNoteDraft}
                    onStartNote={(s) => { setNoteFor(s); setNoteDraft(s.note ?? ''); setMenu(null); }}
                    onSaveNote={() => { if (noteFor) { onSaveNote(noteFor, noteDraft); setNoteFor(null); } }}
                    onCancelNote={() => setNoteFor(null)}
                  />
                ) : (
                  <PlainSongs
                    songs={songs}
                    onSong={setMenu}
                    noteFor={noteFor}
                    noteDraft={noteDraft}
                    onNoteDraft={setNoteDraft}
                    onStartNote={(s) => { setNoteFor(s); setNoteDraft(s.note ?? ''); }}
                    onSaveNote={() => { if (noteFor) { onSaveNote(noteFor, noteDraft); setNoteFor(null); } }}
                    onCancelNote={() => setNoteFor(null)}
                  />
                )}

                {!showSplit && danceTitle && onOpenDance ? (
                  <Pressable onPress={onOpenDance} style={[styles.linkRow, { backgroundColor: c.surface, borderColor: c.line }]}>
                    <View style={[styles.smallBubble, { backgroundColor: c.redTint }]}>
                      <Icon name="ban" size={16} color={c.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Type.subhead, { color: c.ink }]}>{t('moment.avoidTitle')}</Text>
                      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('moment.avoidLives', { title: danceTitle })}</Text>
                    </View>
                    <Icon name="chev-r" size={18} color={c.ink3} />
                  </Pressable>
                ) : null}

                {!isDanceFloor && !isAvoidList && dj ? (
                  <View style={[styles.noteCard, Shadow.card, { backgroundColor: c.surface }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Icon name="dj-note" size={16} color={c.accent} />
                      <Text style={[Type.label, { color: c.accent }]}>{t('moment.noteForDj')}</Text>
                    </View>
                    <View style={[styles.accentBar, { backgroundColor: c.red }]} />
                    <Text style={[styles.noteProse, { color: c.ink }]}>{dj.text}</Text>
                    <Text style={[Type.footnote, { color: c.ink3 }]}>
                      {dj.edited ? t('moment.fromAnswersEdited', { edited: dj.edited }) : t('moment.fromAnswers')}
                    </Text>
                  </View>
                ) : null}

                {!songsEnabled && songs.length === 0 && !showSplit ? (
                  <Text style={[Type.footnote, { color: c.ink3 }]}>{t('moment.noMusic')}</Text>
                ) : null}
              </View>
            ) : null}

            {tab === 'notes' ? (
              <NotesPane djAnswers={visible} answers={answers} songNotes={songNotes} />
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>

      {bottom ? (
        <View style={[styles.bottom, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 16), borderTopColor: c.line }]}>
          {aiPicks && tab === 'songs' ? (
            <Pressable onPress={onForYou} hitSlop={6} style={{ alignSelf: 'center' }}>
              <Text style={[Type.subhead, { color: c.accent }]}>{t('moment.forYou')}</Text>
            </Pressable>
          ) : null}
          <Button label={bottom.label} arrow={bottom.arrow || undefined} onPress={bottom.onPress} />
        </View>
      ) : null}

      <Sheet visible={menu != null} onClose={() => setMenu(null)} title={menu?.title}>
        {menu ? (
          <View style={{ gap: 10 }}>
            <Button label={playingId === menu.id ? t('moment.pause') : t('moment.play')} variant="ghost" onPress={() => { onPlay(menu); setMenu(null); }} />
            {!menu.doNotPlay ? (
              <Button
                label={menu.mustPlay ? t('moment.removeMust') : t('moment.markMust')}
                variant="secondary"
                onPress={() => { onToggleMust(menu); setMenu(null); }}
              />
            ) : null}
            <Button
              label={menu.note ? t('moment.editNote') : t('moment.addNote')}
              variant="ghost"
              onPress={() => { setNoteFor(menu); setNoteDraft(menu.note ?? ''); setMenu(null); }}
            />
            <Pressable onPress={() => { onRemove(menu); setMenu(null); }} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={[Type.button, { color: c.danger }]}>{t('moment.removeSong')}</Text>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function dedupe(list: MomentSong[]): MomentSong[] {
  const seen = new Set<string>();
  const out: MomentSong[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

function QuestionPane({
  visible,
  answers,
  activeId,
  editingAll,
  onChange,
  onPersist,
  onPick,
  onFocus,
}: {
  visible: QuestionRow[];
  answers: Record<string, string>;
  activeId: string | null;
  editingAll: boolean;
  onChange: (id: string, value: string) => void;
  onPersist: (id: string, value: string) => void;
  onPick: (id: string, value: string) => void;
  onFocus: (id: string) => void;
}) {
  const c = useC();
  const { t } = useT();
  if (visible.length === 0) {
    return <Text style={[Type.footnote, { color: c.ink3 }]}>{t('moment.noQuestions')}</Text>;
  }
  const folded = editingAll ? [] : visible.filter((q) => (answers[q.id] ?? '').trim() && q.id !== activeId);
  const rest = editingAll ? [] : visible.filter((q) => !(answers[q.id] ?? '').trim() && q.id !== activeId);
  const expanded = editingAll ? visible : visible.filter((q) => q.id === activeId);

  return (
    <View style={{ gap: 16 }}>
      {folded.length > 0 ? (
        <View style={[styles.fold, { backgroundColor: c.surface, borderColor: c.line }]}>
          {folded.map((q, i) => {
            const n = visible.indexOf(q) + 1;
            return (
              <View key={q.id}>
                {i > 0 ? <View style={[styles.hair, { backgroundColor: c.line }]} /> : null}
                <View style={styles.foldRow}>
                  <Text style={[styles.foldNum, { color: c.red }]}>{String(n).padStart(2, '0')}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>{q.prompt}</Text>
                    <Text style={[Type.subhead, { color: c.ink }]} numberOfLines={1}>{answerText(q, answers[q.id] ?? '')}</Text>
                  </View>
                  <Pressable onPress={() => onFocus(q.id)} hitSlop={8} accessibilityLabel={t('moment.editAnswer')}>
                    <Icon name="edit" size={16} color={c.ink3} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {expanded.map((q) => (
        <ActiveQuestion
          key={q.id}
          q={q}
          index={visible.indexOf(q) + 1}
          total={visible.length}
          value={answers[q.id] ?? ''}
          onChange={(v) => onChange(q.id, v)}
          onPersist={(v) => onPersist(q.id, v)}
          onPick={(v) => onPick(q.id, v)}
        />
      ))}

      {rest.map((q) => {
        const n = visible.indexOf(q) + 1;
        return (
          <Pressable key={q.id} onPress={() => onFocus(q.id)} style={styles.later}>
            <Text style={[styles.laterNum, { color: c.ink3 }]}>{String(n).padStart(2, '0')}</Text>
            <Text style={[Type.callout, { color: c.ink3, flex: 1 }]}>{q.prompt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActiveQuestion({
  q,
  index,
  total,
  value,
  onChange,
  onPersist,
  onPick,
}: {
  q: QuestionRow;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onPersist: (v: string) => void;
  onPick: (v: string) => void;
}) {
  const c = useC();
  const { t } = useT();
  const opts = q.options.map((o) => (typeof o === 'string' ? o : o.label));
  const entries = q.options.map((o) =>
    typeof o === 'string' ? { label: o, children: [] as string[] } : { label: o.label, children: Array.isArray(o.children) ? o.children : [] },
  );
  const hasTree = entries.some((e) => e.children.length > 0);
  const sel = new Set(value ? value.split('|').filter(Boolean) : []);
  const setMulti = (next: Set<string>) => onPick(Array.from(next).join('|'));
  const textLike = q.answer_type === 'long' || q.answer_type === 'short' || (opts.length === 0 && q.answer_type !== 'yesno' && q.answer_type !== 'scale' && q.answer_type !== 'image_select');

  return (
    <View style={[styles.active, Shadow.card, { backgroundColor: c.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={[styles.bigNum, { color: c.red }]}>{String(index).padStart(2, '0')}</Text>
        <Text style={[Type.footnote, { color: c.ink3 }]}>{t('moment.of')} {String(total).padStart(2, '0')}</Text>
      </View>
      <Text style={[styles.prompt, { color: c.ink }]}>{q.prompt}</Text>
      {q.help_text ? <Text style={[Type.footnote, { color: c.ink2 }]}>{q.help_text}</Text> : null}
      <Text style={[Type.label, { color: c.accent, marginTop: 4 }]}>{t('moment.yourAnswer')}</Text>

      {textLike ? (
        <TextInput
          style={StyleSheet.flatten([
            styles.input,
            {
              color: c.ink,
              borderColor: c.red,
              backgroundColor: c.surface,
              minHeight: q.answer_type === 'short' ? 48 : 96,
            },
          ])}
          value={value}
          onChangeText={onChange}
          onBlur={() => onPersist(value)}
          multiline={q.answer_type !== 'short'}
          placeholder={t('moment.placeholder')}
          placeholderTextColor={c.ink3}
        />
      ) : q.answer_type === 'yesno' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['Yes', 'No'] as const).map((o) => (
            <Chip key={o} label={o === 'Yes' ? t('moment.yes') : t('moment.no')} active={value === o} onPress={() => onPick(o)} grow />
          ))}
        </View>
      ) : q.answer_type === 'scale' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
            <Chip key={n} label={n} active={value === n} onPress={() => onPick(n)} square />
          ))}
        </View>
      ) : q.answer_type === 'image_select' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {q.options.map((o, i) => {
            const label = typeof o === 'string' ? o : o.label;
            const image = typeof o === 'string' ? null : o.image;
            const active = value === label;
            return (
              <Pressable key={i} onPress={() => onPick(label)} style={[styles.imgOpt, { borderColor: active ? c.accent : c.line }]}>
                {image ? <Image source={{ uri: image }} style={{ width: 96, height: 96 }} /> : <View style={{ width: 96, height: 96, backgroundColor: c.surface2 }} />}
                <Text style={[Type.footnote, { color: active ? c.accent : c.ink2, padding: 6 }]} numberOfLines={1}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : q.answer_type === 'multiselect' && hasTree ? (
        <View style={{ gap: 8 }}>
          {entries.map((e) => {
            const on = sel.has(e.label);
            return (
              <View key={e.label} style={{ gap: 6 }}>
                <Chip label={e.label} active={on} onPress={() => {
                  const next = new Set(sel);
                  if (next.has(e.label)) { next.delete(e.label); e.children.forEach((ch) => next.delete(ch)); }
                  else next.add(e.label);
                  setMulti(next);
                }} />
                {on && e.children.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 12 }}>
                    {e.children.map((ch) => (
                      <Chip key={ch} label={ch} active={sel.has(ch)} onPress={() => {
                        const next = new Set(sel);
                        if (next.has(ch)) next.delete(ch); else next.add(ch);
                        setMulti(next);
                      }} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {opts.map((o) => {
            const selected = q.answer_type === 'multiselect' ? sel.has(o) : value === o;
            return (
              <Chip
                key={o}
                label={o}
                active={selected}
                onPress={() => {
                  if (q.answer_type === 'multiselect') {
                    const next = new Set(sel);
                    if (next.has(o)) next.delete(o); else next.add(o);
                    setMulti(next);
                  } else onPick(o);
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function Chip({ label, active, onPress, square, grow }: { label: string; active: boolean; onPress: () => void; square?: boolean; grow?: boolean }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        square && { minWidth: 44, paddingHorizontal: 0, alignItems: 'center' },
        grow && { flex: 1, alignItems: 'center' },
        { borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accent : c.surface2 },
      ]}>
      <Text style={{ color: active ? c.onAccent : c.ink, fontFamily: Fonts.semibold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function PlainSongs({
  songs,
  onSong,
  noteFor,
  noteDraft,
  onNoteDraft,
  onStartNote,
  onSaveNote,
  onCancelNote,
}: SongListProps) {
  const c = useC();
  if (songs.length === 0) return null;
  return (
    <View style={[styles.stack, { backgroundColor: c.surface, borderColor: c.line }]}>
      {songs.map((s, i) => (
        <View key={s.id}>
          {i > 0 ? <View style={[styles.hair, { backgroundColor: c.line }]} /> : null}
          <TrackRow index={i + 1} title={s.title} artist={artistLine(s)} mustPlay={s.mustPlay} note={noteFor?.id === s.id ? null : s.note} onPress={() => onSong(s)} />
          <NoteEditor song={s} noteFor={noteFor} noteDraft={noteDraft} onNoteDraft={onNoteDraft} onStartNote={onStartNote} onSaveNote={onSaveNote} onCancelNote={onCancelNote} />
        </View>
      ))}
    </View>
  );
}

function DanceLists({
  must,
  mustTotal,
  expanded,
  onToggleExpand,
  avoid,
  onSong,
  onRemove,
  onAddDoNotPlay,
  noteFor,
  noteDraft,
  onNoteDraft,
  onStartNote,
  onSaveNote,
  onCancelNote,
}: {
  must: MomentSong[];
  mustTotal: number;
  expanded: boolean;
  onToggleExpand: () => void;
  avoid: MomentSong[];
  onSong: (s: MomentSong) => void;
  onRemove: (s: MomentSong) => void;
  onAddDoNotPlay?: () => void;
} & Omit<SongListProps, 'songs' | 'onSong'>) {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="star" size={14} color={c.red} />
          <Text style={[Type.label, { color: c.red }]}>{t('moment.mustPlay')}</Text>
        </View>
        <Text style={[Type.footnote, { color: c.ink3 }]}>{mustTotal} {mustTotal === 1 ? t('moment.song') : t('moment.songs')}</Text>
      </View>
      <View style={[styles.stack, { backgroundColor: c.surface, borderColor: c.line }]}>
        {must.length === 0 ? (
          <Text style={[Type.footnote, { color: c.ink3, padding: 14 }]}>{t('moment.noMust')}</Text>
        ) : (
          must.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <View style={[styles.hair, { backgroundColor: c.line }]} /> : null}
              <TrackRow index={i + 1} title={s.title} artist={artistLine(s)} mustPlay={s.mustPlay} note={noteFor?.id === s.id ? null : s.note} onPress={() => onSong(s)} />
              <NoteEditor song={s} noteFor={noteFor} noteDraft={noteDraft} onNoteDraft={onNoteDraft} onStartNote={onStartNote} onSaveNote={onSaveNote} onCancelNote={onCancelNote} />
            </View>
          ))
        )}
        {mustTotal > 2 ? (
          <Pressable onPress={onToggleExpand} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={[Type.label, { color: c.accent }]}>{expanded ? t('moment.showLess') : t('moment.seeAll', { count: mustTotal })}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="ban" size={14} color={c.red} />
          <Text style={[Type.label, { color: c.red }]}>{t('moment.doNotPlay')}</Text>
        </View>
        <Text style={[Type.footnote, { color: c.ink3 }]}>{avoid.length} {avoid.length === 1 ? t('moment.song') : t('moment.songs')}</Text>
      </View>
      <Text style={[Type.footnote, { color: c.ink2, marginTop: -8 }]}>
        {t('moment.avoidHelp')}
      </Text>
      <View style={[styles.stack, { backgroundColor: c.surface, borderColor: c.line }]}>
        {avoid.map((s, i) => (
          <View key={s.id}>
            {i > 0 ? <View style={[styles.hair, { backgroundColor: c.line }]} /> : null}
            <View>
              <TrackRow title={s.title} artist={artistLine(s)} doNotPlay onPress={() => onSong(s)} />
              <Pressable onPress={() => onRemove(s)} hitSlop={8} style={styles.removeX} accessibilityLabel={t('moment.removeTitle', { title: s.title })}>
                <Icon name="close" size={16} color={c.ink3} />
              </Pressable>
              <NoteEditor song={s} noteFor={noteFor} noteDraft={noteDraft} onNoteDraft={onNoteDraft} onStartNote={onStartNote} onSaveNote={onSaveNote} onCancelNote={onCancelNote} />
            </View>
          </View>
        ))}
        {onAddDoNotPlay ? (
          <Pressable onPress={onAddDoNotPlay} style={styles.addAvoid}>
            <Icon name="plus" size={16} color={c.red} />
            <Text style={[Type.subhead, { color: c.red }]}>{t('moment.addAvoid')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type SongListProps = {
  songs: MomentSong[];
  onSong: (s: MomentSong) => void;
  noteFor: MomentSong | null;
  noteDraft: string;
  onNoteDraft: (v: string) => void;
  onStartNote: (s: MomentSong) => void;
  onSaveNote: () => void;
  onCancelNote: () => void;
};

function NoteEditor(props: Omit<SongListProps, 'songs' | 'onSong'> & { song: MomentSong }) {
  const c = useC();
  const { t } = useT();
  const { song, noteFor, noteDraft, onNoteDraft, onStartNote, onSaveNote, onCancelNote } = props;
  if (noteFor?.id === song.id) {
    return (
      <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
        <TextInput
          style={StyleSheet.flatten([styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface2, minHeight: 72 }])}
          value={noteDraft}
          onChangeText={onNoteDraft}
          placeholder={t('moment.notePh')}
          placeholderTextColor={c.ink3}
          multiline
          autoFocus
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
          <Pressable onPress={onCancelNote}><Text style={[Type.subhead, { color: c.ink2 }]}>{t('common.cancel')}</Text></Pressable>
          <Pressable onPress={onSaveNote}><Text style={[Type.subhead, { color: c.accent }]}>{t('moment.saveNote')}</Text></Pressable>
        </View>
      </View>
    );
  }
  if (song.note || song.doNotPlay) return null;
  return (
    <Pressable onPress={() => onStartNote(song)} style={styles.addNote}>
      <Icon name="dj-note" size={14} color={c.accent} />
      <Text style={[Type.footnote, { color: c.accent }]}>{t('moment.addNote')}</Text>
    </Pressable>
  );
}

function NotesPane({
  djAnswers,
  answers,
  songNotes,
}: {
  djAnswers: QuestionRow[];
  answers: Record<string, string>;
  songNotes: MomentSong[];
}) {
  const c = useC();
  const { t } = useT();
  const answered = djAnswers.filter((q) => answerText(q, answers[q.id] ?? ''));
  if (answered.length === 0 && songNotes.length === 0) {
    return (
      <Text style={[Type.callout, { color: c.ink2 }]}>
        {t('moment.notesEmpty')}
      </Text>
    );
  }
  return (
    <View style={{ gap: 18 }}>
      {answered.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('moment.fromAnswers')}</Text>
          {answered.map((q) => (
            <View key={q.id} style={[styles.noteCard, { backgroundColor: c.surface }]}>
              <Text style={[Type.footnote, { color: c.ink2 }]}>{q.prompt}</Text>
              <Text style={[Type.callout, { color: c.ink, marginTop: 4 }]}>{answerText(q, answers[q.id] ?? '')}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {songNotes.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('moment.songNotes')}</Text>
          {songNotes.map((s) => (
            <View key={s.id} style={[styles.noteCard, { backgroundColor: c.surface }]}>
              <Text style={[Type.subhead, { color: c.ink }]}>{s.title}</Text>
              <Text style={[Type.footnote, { color: c.ink2, marginTop: 4 }]}>{s.note}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function artistLine(s: MomentSong): string | null {
  return s.artist;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  momentTitle: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36 },
  fold: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  foldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  foldNum: { fontFamily: Fonts.display, fontSize: 18, width: 32 },
  hair: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  active: { borderRadius: Radius.lg, padding: 16, gap: 8 },
  bigNum: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32 },
  prompt: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: Fonts.body },
  later: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  laterNum: { fontFamily: Fonts.display, fontSize: 18, width: 32 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  imgOpt: { width: 96, borderWidth: 2, borderRadius: Radius.md, overflow: 'hidden' },
  stack: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  smallBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  noteCard: { borderRadius: Radius.lg, padding: 16, gap: 8 },
  accentBar: { width: 28, height: 3, borderRadius: 2 },
  noteProse: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 48, paddingBottom: 12 },
  addAvoid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  removeX: { position: 'absolute', right: 14, top: 22 },
});
