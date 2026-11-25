import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type AppNotificationPrefs,
} from '@/lib/appNotifications';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { syncPushRegistration } from '@/lib/pushRegistration';
import { teardownPushRegistration } from '@/lib/pushTokenStore';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

const DEFAULT: AppNotificationPrefs = { pushEnabled: true, popupEnabled: true };

/** Push + in-app popup toggles. Backed by `app_notification_prefs` via Supabase RLS. */
export function NotificationPrefsSetting({ reloadSignal = 0 }: { reloadSignal?: number }) {
  const c = useC();
  const { t } = useT();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [prefs, setPrefs] = useState<AppNotificationPrefs>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    if (!uid) {
      setReady(false);
      return;
    }
    const ticket = ++gen.current;
    setReady(false);
    loadNotificationPrefs(uid).then((result) => {
      if (gen.current !== ticket) return;
      if (result.ok) setPrefs(result.prefs);
      setReady(true);
    });
  }, [uid, reloadSignal]);

  async function write(next: AppNotificationPrefs) {
    if (!uid || busy) return;
    const previous = prefs;
    setPrefs(next);
    setBusy(true);
    const result = await saveNotificationPrefs(uid, next);
    if (!result.ok) {
      setPrefs(previous);
      setBusy(false);
      return;
    }
    if (!next.pushEnabled && previous.pushEnabled) {
      await teardownPushRegistration(uid);
    } else if (next.pushEnabled && !previous.pushEnabled) {
      await syncPushRegistration(uid);
    }
    setBusy(false);
  }

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
      <Row
        title={t('notif.pushTitle')}
        subtitle={t('notif.pushSub')}
        value={prefs.pushEnabled}
        disabled={!ready || busy}
        onChange={(pushEnabled) => void write({ ...prefs, pushEnabled })}
        accessibilityLabel={t('notif.pushTitle')}
      />
      <View style={[styles.div, { backgroundColor: c.line }]} />
      <Row
        title={t('notif.popupTitle')}
        subtitle={t('notif.popupSub')}
        value={prefs.popupEnabled}
        disabled={!ready || busy}
        onChange={(popupEnabled) => void write({ ...prefs, popupEnabled })}
        accessibilityLabel={t('notif.popupTitle')}
      />
    </View>
  );
}

function Row({
  title,
  subtitle,
  value,
  disabled,
  onChange,
  accessibilityLabel,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  const c = useC();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: c.sunken, true: c.accent }}
        thumbColor="#ffffff"
        ios_backgroundColor={c.sunken}
        accessibilityLabel={accessibilityLabel}
        {...(Platform.OS === 'web' ? { activeThumbColor: '#ffffff' } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  div: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
});
