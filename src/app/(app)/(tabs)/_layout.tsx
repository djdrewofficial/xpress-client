import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Brand } from '@/lib/theme';
import { useC } from '@/components/ui';

export default function TabsLayout() {
  const c = useC();
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
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Plan', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="music" options={{ title: 'Music', tabBarIcon: icon('🎵') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('🥂') }} />
      <Tabs.Screen name="you" options={{ title: 'My Event', tabBarIcon: icon('💍') }} />
    </Tabs>
  );
}
