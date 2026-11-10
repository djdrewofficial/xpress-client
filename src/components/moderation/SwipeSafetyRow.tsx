import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Status } from '@/lib/theme';

type ConfirmMode = 'remove' | 'mustPlay' | 'added';

const CONFIRM_MS = 4000;
const ADDED_MS = 1100;

/**
 * Swipeable row with in-place tap-to-confirm.
 * Swipe (including full open) snaps back into a confirm overlay; tap runs the
 * action. VoiceOver custom actions skip the overlay and run immediately.
 */
export function SwipeSafetyRow({
  children,
  canRemove = false,
  canMustPlay = false,
  canReport = false,
  onRemove,
  onMustPlay,
  onReport,
  onFinished,
  dismissSignal = 0,
  accessibilityLabel,
  accessibilityActions,
  onAccessibilityAction,
}: {
  children: ReactNode;
  canRemove?: boolean;
  canMustPlay?: boolean;
  canReport?: boolean;
  /** Persist hide. Row animates out first, then this runs. */
  onRemove?: () => void | Promise<void>;
  /** Persist Must Play (do not drop the row yet). */
  onMustPlay?: () => void | Promise<void>;
  onReport?: () => void;
  /** Drop the row from parent state after a successful exit. */
  onFinished?: () => void;
  /** Bump to clear an open confirm (scroll / tap elsewhere). */
  dismissSignal?: number;
  accessibilityLabel: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}) {
  const c = useC();
  const { t } = useT();
  const swipe = useRef<SwipeableMethods>(null);
  const [mode, setMode] = useState<ConfirmMode | null>(null);
  const [gone, setGone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const dismiss = () => {
    clearTimer();
    if (mode === 'added' || busy.current) return;
    setMode(null);
  };

  const armConfirmTimeout = () => {
    clearTimer();
    timer.current = setTimeout(() => setMode(null), CONFIRM_MS);
  };

  const enterConfirm = (next: 'remove' | 'mustPlay') => {
    swipe.current?.close();
    setMode(next);
    armConfirmTimeout();
  };

  useEffect(() => {
    if (dismissSignal > 0) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissSignal]);

  useEffect(() => () => clearTimer(), []);

  const animateOut = () =>
    new Promise<void>((resolve) => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setGone(true);
        resolve();
      });
    });

  const confirmRemove = async () => {
    if (!onRemove || busy.current) return;
    busy.current = true;
    clearTimer();
    try {
      await onRemove();
      await animateOut();
      onFinished?.();
    } catch {
      busy.current = false;
      opacity.setValue(1);
      setGone(false);
      setMode(null);
      return;
    }
    busy.current = false;
  };

  const confirmMustPlay = async () => {
    if (!onMustPlay || busy.current) return;
    busy.current = true;
    clearTimer();
    try {
      await onMustPlay();
    } catch {
      busy.current = false;
      setMode(null);
      return;
    }
    setMode('added');
    await new Promise((r) => {
      timer.current = setTimeout(r, ADDED_MS);
    });
    await animateOut();
    onFinished?.();
    busy.current = false;
  };

  const onOpen = (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
    if (direction === SwipeDirection.LEFT && canRemove) {
      enterConfirm('remove');
      return;
    }
    if (direction === SwipeDirection.RIGHT && canMustPlay) {
      enterConfirm('mustPlay');
      return;
    }
    swipe.current?.close();
  };

  if (gone) return null;

  const showSwipe = (canRemove || canMustPlay) && mode == null;

  const body = (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}>
      {children}
      {mode === 'remove' ? (
        <ConfirmOverlay
          tone="remove"
          label={t('safety.tapToRemove')}
          onConfirm={() => {
            void confirmRemove();
          }}
          onCancel={dismiss}
          onReport={canReport ? onReport : undefined}
          reportLabel={canReport ? t('safety.report') : undefined}
          cancelLabel={t('common.cancel')}
        />
      ) : null}
      {mode === 'mustPlay' ? (
        <ConfirmOverlay
          tone="must"
          label={t('safety.tapToMustPlay')}
          onConfirm={() => {
            void confirmMustPlay();
          }}
          onCancel={dismiss}
          cancelLabel={t('common.cancel')}
        />
      ) : null}
      {mode === 'added' ? <ConfirmOverlay tone="must" label={t('safety.addedMustPlay')} confirmOnly /> : null}
    </View>
  );

  const wrapped = showSwipe ? (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      leftThreshold={56}
      rightThreshold={56}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={
        canMustPlay
          ? () => (
              <View style={styles.leftRail}>
                <ActionChip
                  label={t('record.mustPlay')}
                  color={c.success}
                  icon="star"
                  onPress={() => enterConfirm('mustPlay')}
                />
              </View>
            )
          : undefined
      }
      renderRightActions={
        canRemove
          ? () => (
              <View style={styles.rightRail}>
                <ActionChip
                  label={t('safety.remove')}
                  color={Status.archive}
                  icon="trash"
                  onPress={() => enterConfirm('remove')}
                />
              </View>
            )
          : undefined
      }
      onSwipeableOpen={onOpen}>
      {body}
    </ReanimatedSwipeable>
  ) : (
    body
  );

  return <Animated.View style={{ opacity }}>{wrapped}</Animated.View>;
}

function ActionChip({
  label,
  color,
  icon,
  onPress,
}: {
  label: string;
  color: string;
  icon: 'trash' | 'star';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, { backgroundColor: color }]}>
      <Icon name={icon} size={16} color="#fff" />
      <Text style={styles.actionTxt} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ConfirmOverlay({
  tone,
  label,
  onConfirm,
  onCancel,
  onReport,
  reportLabel,
  cancelLabel,
  confirmOnly = false,
}: {
  tone: 'remove' | 'must';
  label: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onReport?: () => void;
  reportLabel?: string;
  cancelLabel?: string;
  confirmOnly?: boolean;
}) {
  const bg = tone === 'remove' ? Status.archive : '#2e8b62';
  return (
    <View style={[styles.overlay, { backgroundColor: bg }]} pointerEvents="box-none">
      <Pressable
        disabled={confirmOnly || !onConfirm}
        onPress={onConfirm}
        accessibilityRole={confirmOnly ? undefined : 'button'}
        accessibilityLabel={label}
        style={styles.overlayMain}>
        {tone === 'remove' && !confirmOnly ? <Icon name="trash" size={18} color="#fff" /> : null}
        {tone === 'must' ? <Icon name="star" size={18} color="#fff" /> : null}
        <Text style={styles.overlayLabel}>{label}</Text>
      </Pressable>
      {confirmOnly ? null : (
        <View style={styles.overlaySide}>
          {onReport && reportLabel ? (
            <Pressable onPress={onReport} hitSlop={8} accessibilityRole="button" accessibilityLabel={reportLabel}>
              <Text style={styles.overlayLink}>{reportLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onCancel}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={styles.cancelHit}>
            <Icon name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Compact card shell matching MusicContentSafety surfaces. */
export function SafetyCard({ children }: { children: ReactNode }) {
  const c = useC();
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  leftRail: { flexDirection: 'row', alignItems: 'stretch' },
  rightRail: { flexDirection: 'row', alignItems: 'stretch' },
  action: {
    width: 88,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: Radius.lg,
  },
  actionTxt: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: 14,
    gap: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  overlayMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  overlayLabel: {
    flex: 1,
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  overlaySide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overlayLink: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  cancelHit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});
