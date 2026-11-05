import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Fonts } from '@/lib/theme';
import { Icon, useC, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

// Plan is the home base — land there by default even though it sits in the center.
export const unstable_settings = { initialRouteName: '(plan)' };

export default function TabsLayout() {
  const c = useC();
  const { profile } = useAuth();
  const { eventId, loading } = useEvent();

  // Staff's home is the events list — the planner tabs only make sense once
  // they've opened a specific event. (Couples always have their own event here.)
  if (profile?.accountType === 'staff' && !loading && !eventId) {
    return <Redirect href="/events" />;
  }
  const icon = (name: IconName) =>
    function TabIcon({ color }: { color: string }) {
      return <Icon name={name} size={24} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.ink3,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.line,
          backgroundColor: c.surface,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', fontFamily: Fonts.semibold },
      }}>
      <Tabs.Screen name="music" options={{ title: 'Music', tabBarIcon: icon('music') }} />
      <Tabs.Screen name="(plan)" options={{ title: 'Plan', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarIcon: icon('timeline') }} />
      <Tabs.Screen name="you" options={{ title: 'My Event', tabBarIcon: icon('rings') }} />
    </Tabs>
  );
}
