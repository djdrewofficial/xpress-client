import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

import { CoachMark, EmojiIcon, FocusedStatusBar, Icon, ListCell, MomentRow, Sheet, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
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
  banner,
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
  banner?: ReactNode;
}) {
  const c = useC();
  const { t } = useT();
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
      <FocusedStatusBar />
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        {dateLabel ? (
          <Text style={[Type.overline, { color: c.red, letterSpacing: 1.6 }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        ) : null}
        <View style={styles.titleRow}>
          <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>{t('timeline.title')}</Text>
          {canManage && (reordering || chapters.length > 0) ? (
            <Pressable onPress={onToggleReorder} hitSlop={8} accessibilityRole="button" testID="timeline-reorder">
              <Text style={[Type.button, { color: c.accent }]}>{reordering ? t('common.done') : t('timeline.reorder')}</Text>
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
        {banner}
        {reordering ? (
          <View style={[styles.hint, { backgroundColor: c.surface2 }]}>
            <Icon name="drag" size={18} color={c.accent} />
            <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]}>
              {t('timeline.dragHint')}
            </Text>
          </View>
        ) : null}

        {empty ? (
          <Text style={[Type.body, { color: c.ink3, textAlign: 'center', marginTop: Space.xl }]}>
            {t('timeline.empty')}
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
                <Text style={[Type.overline, { color: c.ink3, letterSpacing: 1.2 }]}>{t('timeline.archived', { count: archived.length })}</Text>
                <Text style={[Type.footnote, { color: c.ink3 }]}>
                  {t('timeline.archivedHelp')}
                </Text>
                {archived.map((item) => (
                  <View key={item.id} style={[styles.archived, { backgroundColor: c.surface, borderColor: c.line }]}>
                    <EmojiIcon glyph={item.icon} size={18} color={c.ink3} />
                    <Text style={[Type.callout, { flex: 1, color: c.ink2, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {canManage ? (
                      <Pressable onPress={() => onRestore(item)} hitSlop={8} accessibilityRole="button">
                        <Text style={[Type.button, { color: c.accent }]}>{t('common.restore')}</Text>
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
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      testID="timeline-plus"
      accessibilityRole="button"
      accessibilityLabel={t('timeline.addDay')}
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
  const { t } = useT();
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
          headline={t('timeline.coachTitle')}
          body={t('timeline.coachBody')}
          footnote={t('timeline.coachFoot')}
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
  const { t } = useT();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.menuHead}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.overline, { color: c.red }]}>{t('timeline.title')}</Text>
          <Text style={[Type.title, { color: c.ink, marginTop: 4 }]}>{t('timeline.addDay')}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={22} color={c.ink3} />
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <ListCell
          icon="list-plus"
          title={t('timeline.newMoment')}
          subtitle={t('timeline.newMomentSub')}
          subtitleLines={3}
          onPress={onNewMoment}
        />
        <ListCell
          icon="file-up"
          title={t('timeline.upload')}
          subtitle={t('timeline.uploadSub')}
          subtitleLines={3}
          onPress={busy ? undefined : onUpload}
          trailing={busy ? <Text style={[Type.footnote, { color: c.accent }]}>{t('timeline.uploading')}</Text> : undefined}
        />
      </View>
      <View style={styles.menuNote}>
        <Icon name="info" size={16} color={c.ink3} />
        <Text style={[Type.footnote, { color: c.ink3, flex: 1 }]}>{t('timeline.djSees')}</Text>
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
  const { t } = useT();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const swipe = useRef<SwipeableMethods>(null);
  const clock = splitClock(moment.timeLabel);
  // Locked rows and guests can read a saved time. Only the couple (or staff)
  // can open the picker, and not while this row is the lifted drag card.
  const canEditTime = canManage && moment.timeEnabled && !moment.locked && !reordering && !active;
  const showAdd = !clock && canManage && moment.timeEnabled && !moment.locked;
  const showClock = !!clock && moment.timeEnabled;

  const confirmArchive = () => {
    Alert.alert(
      t('timeline.archiveTitle'),
      t('timeline.archiveBody', { title: moment.title }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => swipe.current?.close() },
        { text: t('timeline.archive'), style: 'destructive', onPress: onArchive },
      ],
    );
  };

  const marker = showAdd || showClock ? (
    <Pressable
      onPress={canEditTime ? onPressTime : undefined}
      onLongPress={canManage ? drag : undefined}
      delayLongPress={180}
      hitSlop={4}
      style={styles.timeHit}
      accessibilityRole={canEditTime ? 'button' : undefined}
      accessibilityLabel={clock ? t('timeline.timeA11y', { title: moment.title }) : t('timeline.setTimeA11y', { title: moment.title })}>
      <View style={[styles.timeBox, { backgroundColor: c.bg }]}>
        {showClock && clock ? (
          <>
            <Text style={[styles.hm, { color: c.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {clock.main}
            </Text>
            {clock.suffix ? <Text style={[styles.suffix, { color: c.ink3 }]}>{clock.suffix}</Text> : null}
          </>
        ) : (
          <Text style={[styles.setTime, { color: c.red }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
            {t('timeline.setTime')}
          </Text>
        )}
      </View>
    </Pressable>
  ) : (
    <View
      style={[styles.dot, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.red }]}
    />
  );

  const card = (
    <View style={styles.lineRow}>
      <View style={styles.gutter}>
        {!active && !first ? <View pointerEvents="none" style={[styles.line, styles.lineUp, { backgroundColor: c.line }]} /> : null}
        {!active && !last ? <View pointerEvents="none" style={[styles.line, styles.lineDown, { backgroundColor: c.line }]} /> : null}
        {marker}
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
          <Text style={styles.archiveTxt}>{t('timeline.archive')}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
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
  gutter: { width: TIME_W + RAIL_W, alignItems: 'flex-end', justifyContent: 'center' },
  timeHit: { alignSelf: 'stretch', flex: 1, alignItems: 'flex-end', justifyContent: 'center', zIndex: 1 },
  timeBox: { width: TIME_W + 4, alignItems: 'center', justifyContent: 'center', marginRight: 1, paddingVertical: 2 },
  hm: { fontFamily: Fonts.display, fontSize: 16, lineHeight: 18, textAlign: 'center' },
  suffix: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.6, textAlign: 'center', marginTop: 1 },
  setTime: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 13, textAlign: 'center', width: TIME_W },
  line: { position: 'absolute', width: 1.5, left: TIME_W + (RAIL_W - 1.5) / 2 },
  lineUp: { top: 0, bottom: '50%' },
  lineDown: { top: '50%', bottom: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: (RAIL_W - 8) / 2 },
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
