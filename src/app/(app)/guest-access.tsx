import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, useC } from '@/components/ui';
import { listGuestAccess, setGuestAccess, type GuestAccessSection } from '@/lib/guestSections';
import { useT } from '@/lib/i18n';
import { Radius, Type } from '@/lib/theme';

/** Hosts choose which moments guests can see and fill out. */
export default function GuestAccessScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  const [sections, setSections] = useState<GuestAccessSection[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const result = await listGuestAccess(eventId);
    if (!result.ok) {
      setSections([]);
      setNotice(result.status === 403 ? t('links.accessDenied') : result.status === 503 ? t('links.setup') : result.error || t('links.failed'));
      return;
    }
    setSections(result.sections);
    setNotice(null);
  }, [eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(section: GuestAccessSection, guestEnabled: boolean) {
    setSections((prev) => (prev ?? []).map((row) => (row.id === section.id ? { ...row, guestEnabled } : row)));
    const result = await setGuestAccess(eventId, section.id, guestEnabled);
    if (!result.ok) {
      setSections((prev) => (prev ?? []).map((row) => (row.id === section.id ? section : row)));
      setNotice(result.status === 403 ? t('links.accessDenied') : result.error || t('links.failed'));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Icon name="chev-l" size={24} color={c.ink} />
        </Pressable>
        <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>{t('links.access')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Text style={[Type.body, { color: c.ink2 }]}>{t('links.accessHelp')}</Text>
        {sections == null ? <ActivityIndicator color={c.accent} /> : null}
        {notice ? <Text style={[Type.footnote, { color: c.redInk }]}>{notice}</Text> : null}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          {(sections ?? []).map((section, index) => (
            <View key={section.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <Text style={[Type.callout, { color: c.ink, flex: 1 }]}>{section.title || t('links.untitled')}</Text>
              <Switch
                value={section.guestEnabled}
                onValueChange={(value) => toggle(section, value)}
                trackColor={{ true: c.accent, false: c.line }}
                accessibilityLabel={section.title}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
