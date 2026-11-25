import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoModeBanner } from '@/components/DemoModeBanner';
import { TabBar, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

// Home is the landing tab. Route groups stay put so /timeline, /music, /you, and /group/[id] deep links don't move.
export const unstable_settings = { initialRouteName: '(plan)' };

const TAB_KEY: Record<string, string> = {
  '(plan)': 'home',
  timeline: 'timeline',
  music: 'music',
  you: 'my-event',
};

function PlannerTabBar({ state, navigation }: BottomTabBarProps) {
  const route = state.routes[state.index];
  const active = TAB_KEY[route?.name] ?? 'home';
  return (
    <TabBar
      active={active}
      onChange={(key) => {
        const name = Object.keys(TAB_KEY).find((k) => TAB_KEY[k] === key);
        if (!name) return;
        const target = state.routes.find((r) => r.name === name);
        if (!target) return;
        const event = navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(target.name, target.params);
      }}
    />
  );
}

export default function TabsLayout() {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { eventId, loading, demoMode, refreshDemoFlag } = useEvent();

  useFocusEffect(
    useCallback(() => {
      void refreshDemoFlag();
    }, [refreshDemoFlag]),
  );

  // Banner consumes the top safe area; child screens keep their usual insets.top = 0
  // so Home / Timeline / Music / My Event don't double-pad under the notch.
  // Must run before any early return — PR 41 put this after the staff Redirect and
  // crashed release builds with "Rendered fewer hooks than expected".
  const childInsets = useMemo(
    () => (demoMode ? { ...insets, top: 0 } : insets),
    [demoMode, insets],
  );

  // Staff's home is the events list — the planner tabs only make sense once
  // they've opened a specific event. (Couples always have their own event here.)
  if (profile?.accountType === 'staff' && !loading && !eventId) {
    return <Redirect href="/events" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {demoMode ? (
        <View style={{ paddingTop: insets.top, backgroundColor: c.bg }}>
          <DemoModeBanner />
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={childInsets}>
        <View style={{ flex: 1 }}>
          <Tabs
            safeAreaInsets={{ bottom: 0 }}
            tabBar={(props) => <PlannerTabBar {...props} />}
            screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="(plan)" options={{ title: 'Home' }} />
            <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
            <Tabs.Screen name="music" options={{ title: 'Music' }} />
            <Tabs.Screen name="you" options={{ title: 'My Event' }} />
          </Tabs>
        </View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
