import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { Icon, useC } from '@/components/ui';
import { listJoinLinks, resetJoinLink, type JoinLink, type JoinRole } from '@/lib/eventLinks';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Radius, Shadow, Type } from '@/lib/theme';

const ROLE_KEY: Record<JoinRole, TranslationKey> = {
  host: 'links.host',
  guest: 'links.guest',
};

/**
 * Host link and guest link for this event. Replaces emailing a partner a one-time code.
 * Staff use XOS for these links. A 403 hides the card.
 */
export function HostEventTools({ eventId }: { eventId: string }) {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const [links, setLinks] = useState<JoinLink[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const result = await listJoinLinks(eventId);
    if (!result.ok) {
      if (result.status === 403) {
        setHidden(true);
        return;
      }
      setLinks([]);
      setNotice(result.status === 503 ? t('links.setup') : result.error || t('links.failed'));
      return;
    }
    setHidden(false);
    setLinks(result.links);
    setNotice(null);
  }, [eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(url: string) {
    await Clipboard.setStringAsync(url);
    setNotice(t('links.copied'));
  }

  async function share(url: string) {
    try {
      await Share.share({ message: url });
    } catch {
      setNotice(t('links.failed'));
    }
  }

  function reset(role: JoinRole) {
    Alert.alert(t('links.resetTitle'), t('links.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('links.reset'),
        style: 'destructive',
        onPress: async () => {
          const result = await resetJoinLink(eventId, role);
          if (!result.ok) {
            setNotice(result.status === 503 ? t('links.setup') : result.error || t('links.failed'));
            return;
          }
          setLinks((prev) => (prev ?? []).map((link) => (link.role === role ? result.link : link)));
          setNotice(t('links.resetDone'));
        },
      },
    ]);
  }

  if (hidden) return null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={[Type.label, { color: c.ink3 }]}>{t('links.title')}</Text>
      <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
        <Text style={[Type.footnote, { color: c.ink2, paddingHorizontal: 16, paddingTop: 14 }]}>{t('links.help')}</Text>
        {(links ?? []).map((link) => (
          <View key={link.role} style={[styles.row, { borderTopColor: c.line }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[Type.headline, { color: c.ink }]}>{t(ROLE_KEY[link.role])}</Text>
              <Text style={[Type.footnote, { color: c.ink3 }]} numberOfLines={1}>{link.url}</Text>
            </View>
            <Pressable onPress={() => copy(link.url)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('links.copy')}>
              <Text style={[Type.footnote, { color: c.accent }]}>{t('links.copy')}</Text>
            </Pressable>
            <Pressable onPress={() => share(link.url)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('links.share')}>
              <Text style={[Type.footnote, { color: c.accent }]}>{t('links.share')}</Text>
            </Pressable>
            <Pressable onPress={() => reset(link.role)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('links.reset')}>
              <Text style={[Type.footnote, { color: c.redInk }]}>{t('links.reset')}</Text>
            </Pressable>
          </View>
        ))}
        {links && links.length === 0 && !notice ? (
          <Text style={[Type.footnote, { color: c.ink3, padding: 16 }]}>{t('links.failed')}</Text>
        ) : null}
        <Pressable
          onPress={() => router.push({ pathname: '/guest-access', params: { eventId } })}
          style={[styles.access, { borderTopColor: c.line }]}
          accessibilityRole="button">
          <Icon name="users" size={20} color={c.accent} />
          <Text style={[Type.callout, { color: c.ink, flex: 1 }]}>{t('links.access')}</Text>
          <Icon name="chev-r" size={18} color={c.ink3} />
        </Pressable>
      </View>
      {notice ? <Text style={[Type.footnote, { color: c.ink2 }]}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  access: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
