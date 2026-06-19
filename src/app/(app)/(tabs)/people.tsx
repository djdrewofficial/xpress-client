import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useC } from '@/components/ui';
import { BrandHeader } from '@/components/Logo';
import { Radius, Space } from '@/lib/theme';

export default function PeopleScreen() {
  const c = useC();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <BrandHeader />
        <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.md, paddingBottom: Space.xxl * 3 }}>
          <Text style={[styles.title, { color: c.text }]}>People</Text>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ color: c.textSecondary }}>
              Invite a partner or planner to help with your planning. Coming soon.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
});
