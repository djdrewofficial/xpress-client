import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NestedReorderableList,
  ScrollViewContainer,
  useIsActive,
  useReorderableDrag,
} from 'react-native-reorderable-list';

import { CoachMark, EmojiIcon, Icon, ListCell, MomentRow, Sheet, useC } from '@/components/ui';
import { Fonts, Radius, Shadow, Space, Status, Type } from '@/lib/theme';

export type TimelineMoment = {
  id: string;
  title: string;
  icon: string | null;
  timeLabel: string | null;
  timeEnabled: boolean;
  locked: boolean;
  meta?: string;
  badge?: string;
};

export type TimelineChapter = { id: string; title: string; moments: TimelineMoment[] };
export type TimelineArchived = { id: string; title: string; icon: string | null };

const TIME_W = 44;
const RAIL_W = 14;

function haptic(kind: 'pick' | 'drop') {
  if (Platform.OS === 'web') return;
  const style = kind === 'pick' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
  Haptics.impactAsync(style).catch(() => {});
}

function onDragStart() {
  'worklet';
  runOnJS(haptic)('pick');
}

function onDragEnd() {
  'worklet';
  runOnJS(haptic)('drop');
}

/**
 * Timeline chrome: date + title, time rail, moment cards, reorder mode, plus menu,
 * and the first-visit coach. Data and persistence stay in the screen.
 */
export function TimelineBoard({
  dateLabel,
  chapters,
  archived,
  canManage,
  reordering,
  coach,
  menuOpen,
  uploadBusy,
  onToggleReorder,
  onPressPlus,
  onDismissCoach,
  onCloseMenu,
  onNewMoment,
  onUpload,
  onPressMoment,
  onPressTime,
  onArchive,
  onRestore,
  onReorder,
}: {
  dateLabel: string | null;
  chapters: TimelineChapter[];
  archived: TimelineArchived[];
  canManage: boolean;
  reordering: boolean;
  coach: boolean;
  menuOpen: boolean;
  uploadBusy: boolean;
  onToggleReorder: () => void;
  onPressPlus: () => void;
  onDismissCoach: () => void;
  onCloseMenu: () => void;
  onNewMoment: () => void;
  onUpload: () => void;
  onPressMoment: (moment: TimelineMoment) => void;
  onPressTime: (moment: TimelineMoment) => void;
  onArchive: (chapterId: string, moment: TimelineMoment) => void;
  onRestore: (item: TimelineArchived) => void;
  onReorder: (chapterId: string, from: number, to: number) => void;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const plusRef = useRef<View>(null);
  const [plusBox, setPlusBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const measurePlus = useCallback(() => {
    plusRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setPlusBox({ x, y, width, height });
    });
  }, []);

  useEffect(() => {
    if (!coach) return;
    measurePlus();
    const t = setTimeout(measurePlus, 60);
    return () => clearTimeout(t);
  }, [coach, measurePlus]);

  const empty = chapters.length === 0 && archived.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 20, paddingBottom: 8 }}>
        {dateLabel ? (
          <Text style={[Type.overline, { color: c.red, letterSpacing: 1.6 }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        ) : null}
        <View style={styles.titleRow}>
          <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>Timeline</Text>
          {canManage && (reordering || chapters.length > 0) ? (
            <Pressable onPress={onToggleReorder} hitSlop={8} accessibilityRole="button" testID="timeline-reorder">
              <Text style={[Type.button, { color: c.accent }]}>{reordering ? 'Done' : 'Reorder'}</Text>
            </Pressable>
          ) : null}
          {canManage && !reordering ? (
            <View ref={plusRef} onLayout={measurePlus} collapsable={false} style={{ marginLeft: 12 }}>
              <PlusButton onPress={onPressPlus} />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollViewContainer
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingLeft: 10, paddingRight: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}>
        {reordering ? (
          <View style={[styles.hint, { backgroundColor: c.surface2 }]}>
            <Icon name="drag" size={18} color={c.accent} />
            <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]}>
              Drag to change the order. Times stay with their moment.
            </Text>
          </View>
        ) : null}

        {empty ? (
          <Text style={[Type.body, { color: c.ink3, textAlign: 'center', marginTop: Space.xl }]}>
            Your plan sections will appear here once your event is set up.
          </Text>
        ) : (
          <>
            {chapters.map((chapter, chapterIndex) => (
              <View key={chapter.id} style={{ marginTop: chapterIndex === 0 ? 4 : 18 }}>
                <View style={[styles.chapter, { marginLeft: TIME_W + RAIL_W }]}>
                  <Text style={[styles.chapterNum, { color: c.red }]}>{String(chapterIndex + 1).padStart(2, '0')}</Text>
                  <Text style={[Type.overline, { color: c.ink3, letterSpacing: 1.2, flexShrink: 1 }]} numberOfLines={1}>
                    {chapter.title}
                  </Text>
                </View>
                <NestedReorderableList
                  data={chapter.moments}
                  keyExtractor={(m) => m.id}
                  scrollable={false}
                  dragEnabled={canManage}
                  shouldUpdateActiveItem
                  cellAnimations={{ opacity: 1 }}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onReorder={({ from, to }) => onReorder(chapter.id, from, to)}
                  renderItem={({ item, index }) => (
                    <MomentLine
                      moment={item}
                      first={index === 0}
                      last={index === chapter.moments.length - 1}
                      canManage={canManage}
                      reordering={reordering}
                      onPress={() => onPressMoment(item)}
                      onPressTime={() => onPressTime(item)}
                      onArchive={() => onArchive(chapter.id, item)}
                    />
                  )}
                />
              </View>
            ))}

            {archived.length > 0 ? (
              <View style={{ marginTop: Space.xl, gap: Space.sm }}>
                <Text style={[Type.overline, { color: c.ink3, letterSpacing: 1.2 }]}>Archived · {archived.length}</Text>
                <Text style={[Type.footnote, { color: c.ink3 }]}>
                  Archived sections are removed from your timeline and plan. Restore any of them anytime.
                </Text>
                {archived.map((item) => (
                  <View key={item.id} style={[styles.archived, { backgroundColor: c.surface, borderColor: c.line }]}>
                    <EmojiIcon glyph={item.icon} size={18} color={c.ink3} />
                    <Text style={[Type.callout, { flex: 1, color: c.ink2, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {canManage ? (
                      <Pressable onPress={() => onRestore(item)} hitSlop={8} accessibilityRole="button">
                        <Text style={[Type.button, { color: c.accent }]}>Restore</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollViewContainer>

      <TimelineMenu visible={menuOpen} busy={uploadBusy} onClose={onCloseMenu} onNewMoment={onNewMoment} onUpload={onUpload} />

      {coach && canManage ? (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismissCoach}>
          <CoachOverlay box={plusBox} onDismiss={onDismissCoach} onPlus={onPressPlus} />
        </Modal>
      ) : null}
    </View>
  );
}

function PlusButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      testID="timeline-plus"
      accessibilityRole="button"
      accessibilityLabel="Add to your day"
      style={({ pressed }) => [styles.plus, Shadow.button, { opacity: pressed ? 0.9 : 1 }]}>
      <Icon name="plus" size={22} color="#ffffff" />
    </Pressable>
  );
}

function CoachOverlay({
  box,
  onDismiss,
  onPlus,
}: {
  box: { x: number; y: number; width: number; height: number } | null;
  onDismiss: () => void;
  onPlus: () => void;
}) {
  const top = box ? box.y + box.height + 14 : 120;
  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      {box ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.halo, { left: box.x - 16, top: box.y - 16, width: box.width + 32, height: box.height + 32 }]}
          />
          <View
            pointerEvents="none"
            style={[styles.ring, { left: box.x - 8, top: box.y - 8, width: box.width + 16, height: box.height + 16 }]}
          />
          <View style={{ position: 'absolute', left: box.x, top: box.y }}>
            <PlusButton onPress={onPlus} />
          </View>
        </>
      ) : null}
      <View style={[styles.coach, { top, right: 16 }]}>
        <CoachMark
          visible
          headline="This plus is yours"
          body="Tap it to add a moment, or upload the timeline from your planner and we will line it up for you."
          footnote="Shows once. Find it anytime under the plus."
          onDismiss={onDismiss}
        />
      </View>
    </View>
  );
}

export function TimelineMenu({
  visible,
  busy,
  onClose,
  onNewMoment,
  onUpload,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onNewMoment: () => void;
  onUpload: () => void;
}) {
  const c = useC();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.menuHead}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.overline, { color: c.red }]}>Timeline</Text>
          <Text style={[Type.title, { color: c.ink, marginTop: 4 }]}>Add to your day</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={22} color={c.ink3} />
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <ListCell
          icon="list-plus"
          title="New moment"
          subtitle="A toast, a shoe game, a late night snack. Anything you want on the day."
          subtitleLines={3}
          onPress={onNewMoment}
        />
        <ListCell
          icon="file-up"
          title="Upload planner timeline"
          subtitle="PDF, photo or doc from your planner. We line it up and you check it before anything changes."
          subtitleLines={3}
          onPress={busy ? undefined : onUpload}
          trailing={busy ? <Text style={[Type.footnote, { color: c.accent }]}>Uploading…</Text> : undefined}
        />
      </View>
      <View style={styles.menuNote}>
        <Icon name="info" size={16} color={c.ink3} />
        <Text style={[Type.footnote, { color: c.ink3, flex: 1 }]}>Your DJ sees changes as soon as you save.</Text>
      </View>
    </Sheet>
  );
}

function MomentLine({
  moment,
  first,
  last,
  canManage,
  reordering,
  onPress,
  onPressTime,
  onArchive,
}: {
  moment: TimelineMoment;
  first: boolean;
  last: boolean;
  canManage: boolean;
  reordering: boolean;
  onPress: () => void;
  onPressTime: () => void;
  onArchive: () => void;
}) {
  const c = useC();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const swipe = useRef<SwipeableMethods>(null);
  const editable = canManage && moment.timeEnabled && !moment.locked;
  const clock = splitClock(moment.timeLabel);

  const confirmArchive = () => {
    Alert.alert(
      'Archive this section?',
      `"${moment.title}" will be removed from your timeline and your plan. You can restore it anytime from the Archived list.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipe.current?.close() },
        { text: 'Archive', style: 'destructive', onPress: onArchive },
      ],
    );
  };

  const time = (
    <Pressable
      onPress={editable ? onPressTime : undefined}
      disabled={!editable}
      hitSlop={6}
      style={styles.timeCol}
      accessibilityRole={editable ? 'button' : undefined}
      accessibilityLabel={clock ? `${moment.title} time` : `Set time for ${moment.title}`}>
      {clock ? (
        <>
          <Text style={[styles.hm, { color: c.ink }]}>{clock.main}</Text>
          {clock.suffix ? <Text style={[styles.suffix, { color: c.ink3 }]}>{clock.suffix}</Text> : null}
        </>
      ) : moment.timeEnabled ? (
        <Text style={[styles.setTime, { color: c.red }]}>{'Set\ntime'}</Text>
      ) : null}
    </Pressable>
  );

  const card = (
    <View style={styles.lineRow}>
      {time}
      <View style={styles.rail} pointerEvents="none">
        {!active && !first ? <View style={[styles.line, styles.lineUp, { backgroundColor: c.line }]} /> : null}
        {!active && !last ? <View style={[styles.line, styles.lineDown, { backgroundColor: c.line }]} /> : null}
        <View
          style={[
            styles.dot,
            clock
              ? { backgroundColor: c.ink }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.red },
          ]}
        />
      </View>
      <View style={{ flex: 1, paddingVertical: 6 }}>
        <MomentRow
          title={moment.title}
          showTime={false}
          handle={canManage}
          chevron={!canManage}
          dragging={active}
          accentBorder={active}
          meta={moment.meta}
          metaIcon={moment.meta ? 'music' : undefined}
          badge={moment.badge}
          leading={<MomentGlyph glyph={moment.icon} />}
          onPress={reordering ? undefined : onPress}
          onLongPress={canManage ? drag : undefined}
        />
      </View>
    </View>
  );

  if (!canManage) return card;

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={60}
      renderRightActions={() => (
        <View style={styles.archiveAction}>
          <Icon name="trash" size={16} color="#fff" />
          <Text style={styles.archiveTxt}>Archive</Text>
        </View>
      )}
      onSwipeableOpen={confirmArchive}>
      {card}
    </ReanimatedSwipeable>
  );
}

function MomentGlyph({ glyph }: { glyph: string | null }) {
  const c = useC();
  return (
    <View style={[styles.glyph, { backgroundColor: c.accentTint }]}>
      <EmojiIcon glyph={glyph} size={18} color={c.accent} />
    </View>
  );
}

function splitClock(time?: string | null): { main: string; suffix: string | null } | null {
  if (!time || !time.trim()) return null;
  const match = time.trim().match(/^(.*?)(?:\s*(AM|PM))$/i);
  if (match && match[2]) return { main: match[1].trim(), suffix: match[2].toUpperCase() };
  return { main: time.trim(), suffix: null };
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fe3a3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  chapterNum: { fontFamily: Fonts.bold, fontSize: 13, lineHeight: 16 },
  lineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timeCol: { width: TIME_W, alignItems: 'center', justifyContent: 'center' },
  hm: { fontFamily: Fonts.display, fontSize: 18, lineHeight: 20, textAlign: 'center' },
  suffix: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.6, textAlign: 'center', marginTop: 1 },
  setTime: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 13, textAlign: 'center', width: 40 },
  rail: { width: RAIL_W, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', width: 1.5, left: (RAIL_W - 1.5) / 2 },
  lineUp: { top: 0, bottom: '50%' },
  lineDown: { top: '50%', bottom: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  glyph: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  archiveAction: {
    flex: 1,
    backgroundColor: Status.archive,
    borderRadius: Radius.lg,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: Space.lg,
  },
  archiveTxt: { color: '#fff', fontFamily: Fonts.heavy, fontSize: 15 },
  archived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  menuNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  scrim: { backgroundColor: 'rgba(18,12,30,0.55)' },
  halo: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 2, borderColor: '#ffffff' },
  coach: { position: 'absolute', width: 300, maxWidth: '92%' },
});
