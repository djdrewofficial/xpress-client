import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { loadOwnMobile, requestPromotionalTexts } from '@/lib/smsConsent';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/**
 * Promotional texts only. Off until a server record exists.
 * This app has no SMS consent API, so turning it on does not count as saved.
 */
export function SmsConsentSetting({
  onPrivacy,
  onTerms,
  preview = false,
}: {
  onPrivacy: () => void;
  onTerms: () => void;
  preview?: boolean;
}) {
  const c = useC();
  const { t } = useT();
  const { profile } = useAuth();
  const [hasPhone, setHasPhone] = useState<boolean | null>(preview ? false : null);
  const [notice, setNotice] = useState<'needPhone' | 'unavailable' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview || !profile) return;
    let cancelled = false;
    loadOwnMobile({ clientId: profile.clientId, eventGuestId: profile.eventGuestId }).then((phone) => {
      if (!cancelled) setHasPhone(!!phone);
    });
    return () => {
      cancelled = true;
    };
  }, [preview, profile]);

  async function turnOn() {
    if (busy || preview || !profile) return;
    setBusy(true);
    const result = await requestPromotionalTexts({
      clientId: profile.clientId,
      eventGuestId: profile.eventGuestId,
    });
    setBusy(false);
    setHasPhone(result.reason !== 'no-phone');
    setNotice(result.reason === 'no-phone' ? 'needPhone' : 'unavailable');
  }

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.body')}</Text>
      <View style={row}>
        <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('sms.toggle')}</Text>
        <Switch
          value={false}
          disabled={busy || hasPhone === null}
          onValueChange={(next) => {
            if (next) void turnOn();
          }}
          trackColor={{ false: c.sunken, true: c.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={c.sunken}
          accessibilityLabel={t('sms.toggle')}
        />
      </View>
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.disclosure')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.reassurance')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>
        <Text onPress={onTerms} style={{ color: c.accent }}>{t('legal.termsTitle')}</Text>
        {' · '}
        <Text onPress={onPrivacy} style={{ color: c.accent }}>{t('legal.privacyTitle')}</Text>
      </Text>
      {notice === 'needPhone' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.needPhone')}</Text> : null}
      {notice === 'unavailable' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.unavailable')}</Text> : null}
    </View>
  );
}

const card = { borderRadius: Radius.lg };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
