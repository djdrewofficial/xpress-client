import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Button, Sheet, useC } from '@/components/ui';
import { grantAiConsent, loadAiConsent, withdrawAiConsent } from '@/lib/aiConsent';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/** Host-only. Guests never mount this. Off until the server says it is granted. */
export function AiConsentSetting({
  eventId,
  reloadSignal = 0,
  onPrivacy,
}: {
  eventId: string;
  reloadSignal?: number;
  onPrivacy: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const [granted, setGranted] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadAiConsent(eventId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setGranted(false);
        setUnavailable(result.unavailable);
        setFailed(!result.unavailable);
      } else {
        setGranted(result.record.granted);
        setUnavailable(false);
        setFailed(false);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, reloadSignal]);

  async function turnOff() {
    if (busy || !granted) return;
    setBusy(true);
    setFailed(false);
    const result = await withdrawAiConsent(eventId);
    setBusy(false);
    if (!result.ok) {
      setGranted(true);
      setUnavailable(result.unavailable);
      setFailed(!result.unavailable);
      return;
    }
    setGranted(result.record.granted);
    setUnavailable(false);
  }

  async function confirmOn() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await grantAiConsent(eventId);
    setBusy(false);
    setConfirm(false);
    if (!result.ok) {
      setGranted(false);
      setUnavailable(result.unavailable);
      setFailed(!result.unavailable);
      return;
    }
    setGranted(result.record.granted);
    setUnavailable(false);
  }

  const disabled = !ready || busy || unavailable;

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <View style={row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[title, { color: c.ink }]}>{t('ai.title')}</Text>
          <Text style={[Type.footnote, { color: c.ink2 }]}>{t('ai.body')}</Text>
          <Text onPress={onPrivacy} style={[Type.footnote, { color: c.accent }]}>
            {t('legal.privacyTitle')}
          </Text>
        </View>
        <Switch
          value={granted}
          disabled={disabled}
          onValueChange={(next) => {
            if (disabled) return;
            if (next) setConfirm(true);
            else void turnOff();
          }}
          trackColor={{ false: c.sunken, true: c.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={c.sunken}
          accessibilityLabel={t('ai.title')}
        />
      </View>
      {unavailable ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.unavailable')}</Text> : null}
      {failed ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.failed')}</Text> : null}

      <Sheet visible={confirm} onClose={() => { if (!busy) setConfirm(false); }} title={t('ai.confirmTitle')}>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t('ai.body')}</Text>
        <View style={{ height: 12 }} />
        <Button label={busy ? t('ai.saving') : t('ai.allow')} onPress={() => void confirmOn()} disabled={busy} />
        <View style={{ height: 8 }} />
        <Button label={t('ai.notNow')} variant="ghost" onPress={() => setConfirm(false)} disabled={busy} />
      </Sheet>
    </View>
  );
}

const card = { borderRadius: Radius.lg };
const row = { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
