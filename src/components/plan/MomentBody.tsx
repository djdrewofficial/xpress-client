import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { getSectionNotes, normalizeNoteText, saveSectionNotes, type SectionNotesSave } from '@/lib/sectionNotes';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { answerText } from './model';

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
  liked?: boolean;
  /** The signed-in person added this song. */
  mine?: boolean;
};

type Tab = MomentTab;

/**
 * One moment: Questions, Songs when this section has music, and Notes.
 * Notes are free text for the moment. Staff also get a private box.
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
  isDanceFloor,
  songCount,
  songsEnabled,
  onAddMusic,
  onToggleMust,
  onToggleLike,
  onRemove,
  guestMode,
  onSaveNote,
  onPlay,
  playingId,
  special,
  intro,
  sectionId,
  isStaff,
  notesReadOnly,
  initialNotes,
  initialStaffNotes,
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
  isDanceFloor: boolean;
  songCount: number;
  songsEnabled: boolean;
  onAddMusic: () => void;
  onToggleMust: (song: MomentSong) => void;
  onToggleLike?: (song: MomentSong) => void;
  onRemove: (song: MomentSong) => void;
  /** Guests fill open sections. They do not mark must-play or remove someone else's song. */
  guestMode?: boolean;
  onSaveNote: (song: MomentSong, note: string) => void;
  onPlay: (song: MomentSong) => void;
  playingId: string | null;
  special?: ReactNode;
  intro?: string | null;
  sectionId?: string;
  isStaff?: boolean;
  /** When true, the moment notes cannot be edited. Guests can edit notes on open sections. */
  notesReadOnly?: boolean;
  /** From the section row (`client_notes`). Undefined means the payload didn't include it. */
  initialNotes?: string | null;
  /** From the section row (`staff_notes`), staff only. */
  initialStaffNotes?: string | null;
}) {
  const c = useC();
  const { t } = useT();
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

  // Open Dancing groups its playable songs under Must play. Do-not-play songs stay on their own moment.
  const ownMust = songs.filter((s) => !s.doNotPlay);
  const showSplit = isDanceFloor;
  const mustShown = showAllMust || ownMust.length <= 2 ? ownMust : ownMust.slice(0, 2);

  function saveAndContinue() {
    if (!editingAll && activeId) onPersist(activeId, answers[activeId] ?? '');
    setReeditId(null);
    const next = visible.find((q) => q.id !== activeId && !(answers[q.id] ?? '').trim());
    if (next) setFocusId(next.id);
    else if (songsEnabled) onTab('songs');
  }

  const showQuestions = visible.length > 0;
  const showSongs = songsEnabled;
  const tabOptions: { value: Tab; label: string }[] = [
    ...(showQuestions
      ? [{ value: 'questions' as const, label: t('moment.questionsCount', { answered: answeredCount, total: visible.length }) }]
      : []),
    ...(showSongs ? [{ value: 'songs' as const, label: t('moment.songsCount', { count: songCount }) }] : []),
    { value: 'notes' as const, label: t('moment.notes') },
  ];
  const activeTab: Tab = tabOptions.some((o) => o.value === tab) ? tab : tabOptions[0].value;
  const noteField = useAutosaveNote(special ? undefined : sectionId, 'notes', true, {
    initial: initialNotes,
    skipLoad: initialNotes !== undefined,
    readOnly: !!notesReadOnly,
  });
  const staffField = useAutosaveNote(special ? undefined : sectionId, 'staffNotes', !!isStaff, {
    initial: initialStaffNotes,
    skipLoad: initialStaffNotes !== undefined,
  });

  useEffect(() => {
    if (activeTab !== tab) onTab(activeTab);
  }, [activeTab, tab, onTab]);

  const bottom =
    special || activeTab === 'notes'
      ? null
      : activeTab === 'questions'
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
            !special && activeTab === 'questions' && visible.length > 0
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
            {tabOptions.length > 1 ? (
              <SegmentedControl options={tabOptions} value={activeTab} onChange={onTab} />
            ) : null}

            {activeTab === 'questions' && showQuestions ? (
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

            {activeTab === 'songs' && showSongs ? (
              <View style={{ gap: 14 }}>
                {showSplit ? (
                  <DanceLists
                    must={mustShown}
                    mustTotal={ownMust.length}
                    expanded={showAllMust || ownMust.length <= 2}
                    onToggleExpand={() => setShowAllMust((v) => !v)}
                    onSong={setMenu}
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
              </View>
            ) : null}

            {activeTab === 'notes' ? (
              <NotesPane notes={noteField} staff={isStaff ? staffField : null} readOnly={!!notesReadOnly} />
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>

      {bottom ? (
        <View style={[styles.bottom, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 16), borderTopColor: c.line }]}>
          <Button label={bottom.label} arrow={bottom.arrow || undefined} onPress={bottom.onPress} />
        </View>
      ) : null}

      <Sheet visible={menu != null} onClose={() => setMenu(null)} title={menu?.title}>
        {menu ? (
          <View style={{ gap: 10 }}>
            <Button label={playingId === menu.id ? t('moment.pause') : t('moment.play')} variant="ghost" onPress={() => { onPlay(menu); setMenu(null); }} />
            {onToggleLike ? (
              <Button
                label={menu.liked ? t('moment.unlike') : t('moment.like')}
                variant="secondary"
                onPress={() => { onToggleLike(menu); setMenu(null); }}
              />
            ) : null}
            {!guestMode && !menu.doNotPlay ? (
              <Button
                label={menu.mustPlay ? t('moment.removeMust') : t('moment.markMust')}
                variant="secondary"
                onPress={() => { onToggleMust(menu); setMenu(null); }}
              />
            ) : null}
            {!guestMode || menu.mine ? (
              <Button
                label={menu.note ? t('moment.editNote') : t('moment.addNote')}
                variant="ghost"
                onPress={() => { setNoteFor(menu); setNoteDraft(menu.note ?? ''); setMenu(null); }}
              />
            ) : null}
            {!guestMode || menu.mine ? (
              <Pressable onPress={() => { onRemove(menu); setMenu(null); }} style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={[Type.button, { color: c.danger }]}>{t('moment.removeSong')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
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
  if (visible.length === 0) return null;
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
  onSong,
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
  onSong: (s: MomentSong) => void;
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

type NoteSave = 'idle' | 'saving' | 'saved' | 'pending' | 'failed';
type NoteField = { value: string; setValue: (v: string) => void; flush: () => void; state: NoteSave; readOnly: boolean };

const NOTE_SAVE_MS = 700;

function NotesPane({ notes, staff, readOnly }: { notes: NoteField; staff: NoteField | null; readOnly?: boolean }) {
  const c = useC();
  const { t } = useT();

  return (
    <View style={{ gap: 10 }}>
      <Text style={[Type.callout, { color: c.ink2 }]}>{t('moment.notesHelp')}</Text>
      <NoteBox value={notes.value} onChange={notes.setValue} onBlur={notes.flush} editable={!readOnly && !notes.readOnly} />
      {readOnly ? null : <SaveLine state={notes.state} />}
      {staff ? (
        <View style={[styles.staffBlock, { borderTopColor: c.line }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={14} color={c.ink3} />
            <Text style={[Type.subhead, { color: c.ink }]}>{t('moment.staffNotes')}</Text>
          </View>
          <Text style={[Type.footnote, { color: c.ink3 }]}>{t('moment.staffNotesPrivate')}</Text>
          <NoteBox value={staff.value} onChange={staff.setValue} onBlur={staff.flush} />
          <SaveLine state={staff.state} />
        </View>
      ) : null}
    </View>
  );
}

function NoteBox({
  value,
  onChange,
  onBlur,
  placeholder,
  minHeight = 140,
  editable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
}) {
  const c = useC();
  return (
    <TextInput
      style={StyleSheet.flatten([
        styles.input,
        { color: c.ink, borderColor: c.line, backgroundColor: editable ? c.surface : c.surface2, minHeight, textAlignVertical: 'top' },
      ])}
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      editable={editable}
      multiline
      maxLength={4000}
      placeholder={placeholder}
      placeholderTextColor={c.ink3}
    />
  );
}

function SaveLine({ state }: { state: NoteSave }) {
  const c = useC();
  const { t } = useT();
  const label =
    state === 'saving' ? t('common.saving')
    : state === 'saved' ? t('moment.notesSaved')
    : state === 'pending' ? t('moment.notesPending')
    : state === 'failed' ? t('common.couldntSave')
    : null;
  if (!label) return null;
  return <Text style={[Type.footnote, { color: c.ink3 }]}>{label}</Text>;
}

/**
 * Local text that debounces to the section notes endpoint.
 * A 404 keeps whatever was typed and reports that saving waits on the update.
 */
function useAutosaveNote(
  sectionId: string | undefined,
  field: 'notes' | 'staffNotes',
  enabled = true,
  seed?: { initial?: string | null; skipLoad?: boolean; readOnly?: boolean },
) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<NoteSave>('idle');
  const valueRef = useRef('');
  const savedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const missingRef = useRef(false);
  const genRef = useRef(0);
  const immediateRef = useRef(false);
  const [flushTick, setFlushTick] = useState(0);

  useEffect(() => {
    const gen = ++genRef.current;
    dirtyRef.current = false;
    missingRef.current = false;
    savedRef.current = null;
    valueRef.current = '';
    const seeded = seed?.skipLoad ? (seed.initial ?? '') : '';
    setValue(seeded);
    valueRef.current = seeded;
    savedRef.current = seed?.skipLoad ? seeded : null;
    setState('idle');
    if (!sectionId || !enabled || seed?.skipLoad) return;
    let cancel = false;
    const applyLoaded = (res: { ok: true; text: string } | { ok: false; unavailable: boolean }) => {
      if (cancel || genRef.current !== gen) return;
      if (!res.ok) {
        if (res.unavailable) {
          missingRef.current = true;
          setState('pending');
        }
        return;
      }
      if (dirtyRef.current) return;
      savedRef.current = res.text;
      valueRef.current = res.text;
      setValue(res.text);
    };
    void getSectionNotes(sectionId).then((res) => {
      if (!res.ok) {
        applyLoaded(res);
        return;
      }
      const next = (field === 'staffNotes' ? res.notes.staffNotes : res.notes.notes) ?? '';
      applyLoaded({ ok: true, text: next });
    });
    return () => {
      cancel = true;
    };
  }, [sectionId, field, enabled, seed?.skipLoad, seed?.initial]);

  useEffect(() => {
    if (!sectionId || !enabled || seed?.readOnly || !dirtyRef.current) return;
    if (savedRef.current !== null && value === savedRef.current) return;
    const immediate = immediateRef.current;
    immediateRef.current = false;
    if (!missingRef.current) setState('idle');
    const gen = genRef.current;
    const timer = setTimeout(() => {
      const snapshot = valueRef.current;
      if (savedRef.current !== null && snapshot === savedRef.current) return;
      const stored = normalizeNoteText(snapshot);
      if (!missingRef.current) setState('saving');
      const request = saveSectionNotes(sectionId, field === 'staffNotes' ? { staffNotes: stored } : { notes: stored });
      void request.then((result) => {
        if (genRef.current !== gen) return;
        applySave(result, snapshot);
      });
    }, immediate ? 0 : NOTE_SAVE_MS);
    return () => clearTimeout(timer);
  }, [value, sectionId, field, enabled, seed?.readOnly, flushTick]);

  function applySave(result: SectionNotesSave, snapshot: string) {
    if (valueRef.current !== snapshot) return;
    if (result === 'saved') {
      missingRef.current = false;
      const stored = normalizeNoteText(snapshot) ?? '';
      savedRef.current = stored;
      valueRef.current = stored;
      setValue(stored);
      setState('saved');
      return;
    }
    if (result === 'forbidden') {
      setState('failed');
      return;
    }
    if (result === 'unavailable') {
      missingRef.current = true;
      setState('pending');
      return;
    }
    setState('failed');
  }

  function update(next: string) {
    if (seed?.readOnly) return;
    dirtyRef.current = true;
    valueRef.current = next.slice(0, 4000);
    setValue(valueRef.current);
  }

  function flush() {
    if (!dirtyRef.current) return;
    if (savedRef.current !== null && valueRef.current === savedRef.current) return;
    immediateRef.current = true;
    setFlushTick((n) => n + 1);
  }

  return { value, setValue: update, flush, state, readOnly: !!seed?.readOnly };
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
  staffBlock: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 16, gap: 8 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 48, paddingBottom: 12 },
});
