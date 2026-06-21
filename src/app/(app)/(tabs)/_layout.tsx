import { Tabs } from 'expo-router';
import { StyleSheet, Text, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';

import { Brand } from '@/lib/theme';
import { useC } from '@/components/ui';

export default function TabsLayout() {
  const c = useC();
  const scheme = useColorScheme();
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
      <Tabs.Screen name="(plan)" options={{ title: 'Plan', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="music" options={{ title: 'Music', tabBarIcon: icon('🎵') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('🥂') }} />
      <Tabs.Screen name="you" options={{ title: 'My Event', tabBarIcon: icon('💍') }} />
    </Tabs>
  );
}
