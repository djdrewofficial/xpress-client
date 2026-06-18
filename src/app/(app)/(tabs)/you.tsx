import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton, useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function YouScreen() {
  const c = useC();
  const { profile, session, signOut } = useAuth();
  const initials = (profile?.firstName?.[0] ?? '?').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.lg }}>
          <Text style={[styles.title, { color: c.text }]}>You</Text>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center', gap: Space.sm }]}>
            <View style={styles.avatar}><Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{initials}</Text></View>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{profile?.firstName || 'Guest'}</Text>
            <Text style={{ color: c.textSecondary, fontSize: 13 }}>{session?.user.email}</Text>
          </View>
          <GradientButton label="Sign out" onPress={signOut} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Brand.purple, alignItems: 'center', justifyContent: 'center' },
});
