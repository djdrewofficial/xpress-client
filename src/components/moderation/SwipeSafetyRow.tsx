import { useRef, type ReactNode } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
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
import { Fonts, Radius, Shadow } from '@/lib/theme';

type Action = {
  key: string;
  label: string;
  color: string;
  icon?: 'trash' | 'star' | 'shield';
  onPress: () => void;
};

/**
 * Swipeable moderation row. Swipe left → right-side actions (Report / Remove).
 * Swipe right → left-side action (Must Play). Full open runs the primary action.
 */
export function SwipeSafetyRow({
  children,
  leftActions = [],
  rightActions = [],
  accessibilityLabel,
  accessibilityActions,
  onAccessibilityAction,
}: {
  children: ReactNode;
  /** Revealed by swiping right (e.g. Must Play). */
  leftActions?: Action[];
  /** Revealed by swiping left (e.g. Report, Remove). Outer-most is primary. */
  rightActions?: Action[];
  accessibilityLabel: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}) {
  const swipe = useRef<SwipeableMethods>(null);
  const primaryLeft = leftActions[0];
  const primaryRight = rightActions[rightActions.length - 1];

  const open = (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
    if (direction === SwipeDirection.LEFT) {
      primaryRight?.onPress();
    } else {
      primaryLeft?.onPress();
    }
    requestAnimationFrame(() => swipe.current?.close());
  };

  const card = (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}>
      {children}
    </View>
  );

  if (leftActions.length === 0 && rightActions.length === 0) return card;

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      leftThreshold={64}
      rightThreshold={64}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={
        leftActions.length
          ? () => (
              <View style={styles.leftRail}>
                {leftActions.map((action) => (
                  <ActionButton key={action.key} action={action} onDone={() => swipe.current?.close()} />
                ))}
              </View>
            )
          : undefined
      }
      renderRightActions={
        rightActions.length
          ? () => (
              <View style={styles.rightRail}>
                {rightActions.map((action) => (
                  <ActionButton key={action.key} action={action} onDone={() => swipe.current?.close()} />
                ))}
              </View>
            )
          : undefined
      }
      onSwipeableOpen={open}>
      {card}
    </ReanimatedSwipeable>
  );
}

function ActionButton({ action, onDone }: { action: Action; onDone: () => void }) {
  return (
    <Pressable
      onPress={() => {
        action.onPress();
        onDone();
      }}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={[styles.action, { backgroundColor: action.color }]}>
      {action.icon ? <Icon name={action.icon} size={16} color="#fff" /> : null}
      <Text style={styles.actionTxt} numberOfLines={2}>
        {action.label}
      </Text>
    </Pressable>
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
    marginVertical: 0,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: Radius.lg,
  },
  actionTxt: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: 14,
    gap: 8,
  },
});
