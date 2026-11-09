import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Switch, Text, View } from 'react-native';

import { DisclosureSheet } from '@/components/onboarding/DisclosureSheet';
import { useC } from '@/components/ui';
import {
  consentFromRead,
  loadingConsent,
  previewSmsChoice,
  settleConsentWrite,
  smsLockedNotice,
  smsSwitchEnabled,
  type ConsentRead,
  type ConsentUi,
} from '@/lib/consentState';
import { useT } from '@/lib/i18n';
import { grantSmsConsent, loadSmsConsent, withdrawSmsConsent, type SmsConsentResult } from '@/lib/smsConsent';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { scaledType, smsDisclosureKeys } from '@/lib/welcomeCopy';

/** Promotional texts only. The switch is shown only after a server read confirms it. */
export function SmsConsentSetting({
  eventId = null,
  reloadSignal = 0,
  onPrivacy,
  onTerms,
  preview = false,
  previewGranted = false,
  previewLocked = false,
  fontScale = 1,
  layout = 'card',
}: {
  eventId?: string | null;
  reloadSignal?: number;
  onPrivacy: () => void;
  onTerms: () => void;
  preview?: boolean;
  /** Sample preview only. Starts the switch on without a server call. */
  previewGranted?: boolean;
  /** Sample preview only. Shows the no-US-mobile explanation and no switch. */
  previewLocked?: boolean;
  /** Sample preview only. */
  fontScale?: number;
  /** `welcome` is the quiet row. `card` is the My Event setting. */
  layout?: 'card' | 'welcome';
}) {
  const c = useC();
  const { t } = useT();
  const [ui, setUi] = useState<ConsentUi>(loadingConsent());
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    if (preview) {
      setUi(
        previewLocked
          ? { phase: 'known', granted: false, canGrant: false, canWithdraw: false, notice: 'needPhone' }
          : {
              phase: 'known',
              granted: previewGranted,
              canGrant: !previewGranted,
              canWithdraw: previewGranted,
              notice: null,
            },
      );
      return;
    }
    const ticket = ++gen.current;
    setUi(loadingConsent());
    loadSmsConsent().then((result) => {
      if (gen.current !== ticket) return;
      setUi(consentFromRead(asRead(result), 'sms'));
    });
    return () => { gen.current += 1; };
  }, [preview, previewGranted, previewLocked, reloadSignal]);

  async function write(intent: 'grant' | 'withdraw') {
    if (preview) {
      setUi(previewSmsChoice(intent));
      return;
    }
    if (busy || ui.phase !== 'known') return;
    if (intent === 'grant' && !ui.canGrant) return;
    if (intent === 'withdraw' && (!ui.granted || !ui.canWithdraw)) return;
    const ticket = ++gen.current;
    setBusy(true);
    const next = await settleConsentWrite({
      previous: ui,
      kind: 'sms',
      intent,
      write: async () => asRead(intent === 'grant' ? await grantSmsConsent(eventId) : await withdrawSmsConsent(eventId)),
      read: async () => asRead(await loadSmsConsent()),
      isCurrent: () => gen.current === ticket,
    });
    if (gen.current !== ticket) return;
    if (next) setUi(next);
    setBusy(false);
  }

  const known = ui.phase === 'known';
  const enabled = smsSwitchEnabled(ui) && !busy;
  const lockedNotice = smsLockedNotice(ui);

  const welcomeTitle = scaledType(Type.subhead, fontScale);
  const welcomeBody = scaledType(Type.footnote, fontScale);

  if (layout === 'welcome') {
    return (
      <View style={welcomeCard}>
        <View style={[row, { alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[welcomeTitle, { color: c.ink, fontFamily: Fonts.semibold }]}>{t('welcome.smsTitle')}</Text>
            <Text style={[welcomeBody, { color: c.ink2 }]}>{t('welcome.smsLine')}</Text>
            <Text
              onPress={() => setDetails(true)}
              accessibilityRole="link"
              style={[welcomeBody, { color: c.accent, textDecorationLine: 'underline', alignSelf: 'flex-start' }]}>
              {t('welcome.details')}
            </Text>
          </View>
          {enabled ? (
            <Switch
              value={ui.granted === true}
              disabled={false}
              onValueChange={(next) => {
                void write(next ? 'grant' : 'withdraw');
              }}
              trackColor={{ false: c.sunken, true: c.accent }}
              thumbColor="#ffffff"
              ios_backgroundColor={c.sunken}
              accessibilityLabel={t('welcome.smsTitle')}
              // Web paints a teal thumb unless this is set. iOS keeps its white thumb.
              {...(Platform.OS === 'web' ? { activeThumbColor: '#ffffff' } : {})}
            />
          ) : null}
        </View>
        {known ? null : (
          <Text style={[welcomeBody, { color: c.ink2 }]}>
            {ui.phase === 'loading' ? t('sms.checking') : ui.notice === 'unconfirmed' ? t('sms.unconfirmed') : t('sms.unread')}
          </Text>
        )}
        {lockedNotice === 'needPhone' ? (
          <Text
            style={[welcomeBody, { color: c.ink2 }]}
            {...(Platform.OS === 'web'
              ? null
              : { numberOfLines: 1 as const, adjustsFontSizeToFit: true, minimumFontScale: 0.9 })}>
            {t('sms.needPhone')}
          </Text>
        ) : null}
        {lockedNotice === 'unavailable' ? <Text style={[welcomeBody, { color: c.ink2 }]}>{t('sms.unavailable')}</Text> : null}
        {lockedNotice === 'ineligible' ? <Text style={[welcomeBody, { color: c.ink2 }]}>{t('sms.ineligible')}</Text> : null}
        {lockedNotice === 'failed' ? <Text style={[welcomeBody, { color: c.ink2 }]}>{t('sms.failed')}</Text> : null}
        {ui.phase === 'unknown' ? (
          <Pressable onPress={() => void reload()} accessibilityRole="button">
            <Text style={[Type.footnote, { color: c.accent }]}>{t('common.tryAgain')}</Text>
          </Pressable>
        ) : null}
        <DisclosureSheet
          visible={details}
          title={t('welcome.smsTitle')}
          paragraphs={smsDisclosureKeys.map((key) => t(key))}
          onClose={() => setDetails(false)}
          onTerms={() => {
            setDetails(false);
            onTerms();
          }}
          onPrivacy={() => {
            setDetails(false);
            onPrivacy();
          }}
        />
      </View>
    );
  }

  const cardDisabled = !known || busy || (ui.granted ? !ui.canWithdraw : !ui.canGrant);
  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.body')}</Text>
      {known ? (
        <View style={row}>
          <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('sms.toggle')}</Text>
          <Switch
            value={ui.granted === true}
            disabled={cardDisabled}
            onValueChange={(next) => {
              if (cardDisabled) return;
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
    const ticket = ++gen.current;
    setUi(loadingConsent());
    const result = await loadSmsConsent();
    if (gen.current !== ticket) return;
    setUi(consentFromRead(asRead(result), 'sms'));
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
const welcomeCard = { gap: 6 };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
