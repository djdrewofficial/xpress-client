import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { Logo } from '@/components/Logo';
import { EventSwitcher } from '@/components/EventSwitcher';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { Brand, Space } from '@/lib/theme';

/* The one shared top bar: a back button when there's somewhere to go back, the
   event name centered (tap to switch when you have more than one — or, for staff,
   to jump back to the events list), and the Xpress mark on the right. Frosted so
   content reads through it; lives outside scroll views so it stays put. */
export function AppHeader({
  title,
  subtitle,
  back,
  right,
  switchable,
}: {
  title?: string;
  subtitle?: string;
  /** Force the back chevron on/off. Defaults to "show when we can go back". */
  back?: boolean;
  /** Replace the right-hand logo (e.g. an action button). */
  right?: ReactNode;
  /** Force the tap-to-switch affordance on/off. Defaults to auto (multi-event / staff). */
  switchable?: boolean;
}) {
  const c = useC();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { event, events } = useEvent();
  const [switcher, setSwitcher] = useState(false);

  const isStaff = profile?.accountType === 'staff';
  const label = title ?? event?.name ?? (isStaff ? 'Events' : 'Xpress');
  const canSwitch = switchable ?? (isStaff ? !!event : events.length > 1);
  const showBack = back ?? router.canGoBack();

  const onTitle = () => {
    if (isStaff) router.push('/events');
    else if (events.length > 1) setSwitcher(true);
  };

  return (
    <>
      <BlurView
        intensity={50}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={[styles.wrap, { paddingTop: insets.top + 6, borderColor: c.border }]}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={{ color: Brand.purpleLight, fontSize: 30, marginTop: -3 }}>‹</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={canSwitch ? onTitle : undefined} disabled={!canSwitch} style={styles.center} hitSlop={8}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, { color: c.text }]}>{label}</Text>
            {canSwitch ? <Text style={{ color: c.textTertiary, fontSize: 13 }}>⌄</Text> : null}
          </View>
          {subtitle ? <Text numberOfLines={1} style={[styles.sub, { color: c.textTertiary }]}>{subtitle}</Text> : null}
        </Pressable>

        <View style={[styles.side, styles.rightSide]}>{right ?? <Logo variant="icon" height={24} />}</View>
      </BlurView>

      {events.length > 1 ? <EventSwitcher visible={switcher} onClose={() => setSwitcher(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingBottom: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Space.sm,
  },
  side: { width: 46, justifyContent: 'center' },
  rightSide: { alignItems: 'flex-end' },
  back: { width: 42, height: 42, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2, flexShrink: 1 },
  sub: { fontSize: 11, marginTop: 1 },
});
