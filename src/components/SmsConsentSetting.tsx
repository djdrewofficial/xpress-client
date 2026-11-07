import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import {
  consentAfterReconcile,
  consentAfterWrite,
  consentFromRead,
  loadingConsent,
  type ConsentRead,
  type ConsentUi,
} from '@/lib/consentState';
import { useT } from '@/lib/i18n';
import { grantSmsConsent, loadSmsConsent, withdrawSmsConsent, type SmsConsentResult } from '@/lib/smsConsent';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/** Promotional texts only. The switch is shown only after a server read confirms it. */
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
  const [ui, setUi] = useState<ConsentUi>(loadingConsent());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview) {
      setUi({ phase: 'known', granted: false, canGrant: true, canWithdraw: false, notice: null });
      return;
    }
    let cancelled = false;
    setUi(loadingConsent());
    loadSmsConsent().then((result) => {
      if (!cancelled) setUi(consentFromRead(asRead(result), 'sms'));
    });
    return () => {
      cancelled = true;
    };
  }, [preview, reloadSignal]);

  async function write(intent: 'grant' | 'withdraw') {
    if (busy || preview || ui.phase !== 'known') return;
    if (intent === 'grant' && !ui.canGrant) return;
    if (intent === 'withdraw' && (!ui.granted || !ui.canWithdraw)) return;
    setBusy(true);
    const result = intent === 'grant' ? await grantSmsConsent(eventId) : await withdrawSmsConsent(eventId);
    const decided = consentAfterWrite(ui, asRead(result), 'sms', intent);
    if (!decided.reconcile) {
      setUi(decided.ui);
      setBusy(false);
      return;
    }
    setUi(decided.ui);
    const again = await loadSmsConsent();
    setUi(consentAfterReconcile(asRead(again), 'sms'));
    setBusy(false);
  }

  const known = ui.phase === 'known';
  const disabled = !known || busy || (ui.granted ? !ui.canWithdraw : !ui.canGrant);

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.body')}</Text>
      {known ? (
        <View style={row}>
          <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('sms.toggle')}</Text>
          <Switch
            value={ui.granted === true}
            disabled={disabled}
            onValueChange={(next) => {
              if (disabled) return;
              void write(next ? 'grant' : 'withdraw');
            }}
            trackColor={{ false: c.sunken, true: c.accent }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.sunken}
            accessibilityLabel={t('sms.toggle')}
          />
        </View>
      ) : (
        <Text style={[Type.footnote, { color: c.ink2 }]}>
          {ui.phase === 'loading' ? t('sms.checking') : ui.notice === 'unconfirmed' ? t('sms.unconfirmed') : t('sms.unread')}
        </Text>
      )}
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.disclosure')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.reassurance')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>
        <Text onPress={onTerms} style={{ color: c.accent }}>{t('legal.termsTitle')}</Text>
        {' · '}
        <Text onPress={onPrivacy} style={{ color: c.accent }}>{t('legal.privacyTitle')}</Text>
      </Text>
      {ui.notice === 'needPhone' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.needPhone')}</Text> : null}
      {ui.notice === 'unavailable' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.unavailable')}</Text> : null}
      {ui.notice === 'ineligible' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.ineligible')}</Text> : null}
      {ui.notice === 'failed' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.failed')}</Text> : null}
      {ui.phase === 'unknown' ? (
        <Pressable onPress={() => void reload()} accessibilityRole="button">
          <Text style={[Type.footnote, { color: c.accent }]}>{t('common.tryAgain')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  async function reload() {
    setUi(loadingConsent());
    setUi(consentFromRead(asRead(await loadSmsConsent()), 'sms'));
  }
}

function asRead(result: SmsConsentResult): ConsentRead {
  if (!result.ok) return { ok: false, status: result.status, ineligible: result.ineligible };
  return {
    ok: true,
    record: {
      granted: result.record.granted === true,
      canGrant: result.record.capability.canGrant,
      canWithdraw: result.record.capability.canWithdraw,
      reason: result.record.capability.reason,
    },
  };
}

const card = { borderRadius: Radius.lg };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
