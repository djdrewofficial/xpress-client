import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { grantSmsConsent, loadSmsConsent, withdrawSmsConsent, type SmsConsentRecord } from '@/lib/smsConsent';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

type Notice = 'needPhone' | 'unavailable' | 'ineligible' | 'failed' | null;

/** Promotional texts only. The switch follows the server record, never a device flag. */
export function SmsConsentSetting({
  eventId = null,
  reloadSignal = 0,
  onPrivacy,
  onTerms,
  preview = false,
}: {
  eventId?: string | null;
  reloadSignal?: number;
  onPrivacy: () => void;
  onTerms: () => void;
  preview?: boolean;
}) {
  const c = useC();
  const { t } = useT();
  const [granted, setGranted] = useState(false);
  const [canGrant, setCanGrant] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [ready, setReady] = useState(preview);
  const [notice, setNotice] = useState<Notice>(preview ? null : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    setReady(false);
    loadSmsConsent().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setGranted(false);
        setCanGrant(false);
        setCanWithdraw(false);
        setNotice(result.ineligible ? 'ineligible' : result.status === 503 || result.status === 0 || result.status === 400 ? 'unavailable' : 'failed');
      } else {
        apply(result.record);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [preview, reloadSignal]);

  function apply(record: SmsConsentRecord) {
    setGranted(record.granted === true);
    setCanGrant(record.capability.canGrant);
    setCanWithdraw(record.capability.canWithdraw);
    if (record.capability.reason === 'no_mobile_number') setNotice('needPhone');
    else setNotice(null);
  }

  async function turnOn() {
    if (busy || preview || !canGrant) return;
    setBusy(true);
    setNotice(null);
    const result = await grantSmsConsent(eventId);
    setBusy(false);
    if (!result.ok) {
      setGranted(false);
      setNotice(result.ineligible ? 'ineligible' : result.status === 503 || result.status === 0 || result.status === 400 ? 'unavailable' : 'failed');
      return;
    }
    apply(result.record);
    if (result.record.granted !== true) {
      setGranted(false);
      if (result.record.capability.reason !== 'no_mobile_number') setNotice('failed');
    }
  }

  async function turnOff() {
    if (busy || preview || !granted || !canWithdraw) return;
    setBusy(true);
    setNotice(null);
    const result = await withdrawSmsConsent(eventId);
    setBusy(false);
    if (!result.ok) {
      setNotice(result.ineligible ? 'ineligible' : result.status === 503 || result.status === 0 ? 'unavailable' : 'failed');
      return;
    }
    if (result.record.granted === false) {
      apply(result.record);
      return;
    }
    setNotice('failed');
  }

  const disabled = !ready || busy || (granted ? !canWithdraw : !canGrant);

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.body')}</Text>
      <View style={row}>
        <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('sms.toggle')}</Text>
        <Switch
          value={granted}
          disabled={disabled}
          onValueChange={(next) => {
            if (disabled) return;
            if (next) void turnOn();
            else void turnOff();
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
      {notice === 'ineligible' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.ineligible')}</Text> : null}
      {notice === 'failed' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.failed')}</Text> : null}
    </View>
  );
}

const card = { borderRadius: Radius.lg };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
