import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { Brand } from '@/lib/theme';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

// Plan is the home base — land there by default even though it sits in the center.
export const unstable_settings = { initialRouteName: '(plan)' };

export default function TabsLayout() {
  const c = useC();
  const scheme = useColorScheme();
  const { profile } = useAuth();
  const { eventId, loading } = useEvent();

  // Staff's home is the events list — the planner tabs only make sense once
  // they've opened a specific event. (Couples always have their own event here.)
  if (profile?.accountType === 'staff' && !loading && !eventId) {
    return <Redirect href="/events" />;
  }
  const icon = (glyph: string) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.purple,
        tabBarInactiveTintColor: c.textTertiary,
        // Liquid glass: a floating, frosted bar that content scrolls beneath.
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={60} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      {/* Order matters — Plan sits dead center as the raised hero button. */}
      <Tabs.Screen name="music" options={{ title: 'Music', tabBarIcon: icon('🎵') }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: icon('💬') }} />
      <Tabs.Screen
        name="(plan)"
        options={{
          title: 'Plan',
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarIcon: icon('🗓️') }} />
      <Tabs.Screen name="you" options={{ title: 'My Event', tabBarIcon: icon('💍') }} />
    </Tabs>
  );
}

/* The raised, oversized center button for Plan — pops up above the bar like a
   primary action. Renders its own glyph (the default icon/label are replaced). */
function CenterTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const selected = !!accessibilityState?.selected;
  return (
    <View style={styles.centerSlot} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={8} style={styles.centerPress} accessibilityRole="button" accessibilityLabel="Plan">
        <LinearGradient
          colors={[Brand.purple, Brand.purpleLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.centerBtn, { borderColor: selected ? '#ffffff' : 'rgba(255,255,255,0.55)' }]}>
          <Text style={{ fontSize: 26 }}>📋</Text>
        </LinearGradient>
        <Text style={[styles.centerLabel, { color: selected ? Brand.purple : 'rgba(120,120,130,0.9)' }]}>Plan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  centerPress: { alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginTop: -26, // lift it above the bar
    shadowColor: Brand.purple,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centerLabel: { fontSize: 11, fontWeight: '700', marginTop: 3 },
});
