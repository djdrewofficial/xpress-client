import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Button, Sheet, useC } from '@/components/ui';
import { grantAiConsent, loadAiConsent, withdrawAiConsent } from '@/lib/aiConsent';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

type Notice = 'unavailable' | 'blocked' | 'failed' | null;

function noticeFor(status: number, ineligible: boolean): Notice {
  if (ineligible) return 'blocked';
  if (status === 503 || status === 0 || status === 400) return 'unavailable';
  return 'failed';
}

/** Contract-client host only. Off until GET says this event is granted. */
export function AiConsentSetting({
  eventId,
  reloadSignal = 0,
  onPrivacy,
  preview = false,
}: {
  eventId: string;
  reloadSignal?: number;
  onPrivacy: () => void;
  preview?: boolean;
}) {
  const c = useC();
  const { t } = useT();
  const [granted, setGranted] = useState(false);
  const [canGrant, setCanGrant] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [ready, setReady] = useState(preview);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    setReady(false);
    loadAiConsent(eventId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setGranted(false);
        setCanGrant(false);
        setCanWithdraw(false);
        setNotice(noticeFor(result.status, result.ineligible));
      } else {
        apply(result.record);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, preview, reloadSignal]);

  async function turnOff() {
    if (busy || !granted || !canWithdraw || preview) return;
    setBusy(true);
    setNotice(null);
    const result = await withdrawAiConsent(eventId);
    setBusy(false);
    if (!result.ok) {
      setNotice(noticeFor(result.status, result.ineligible));
      return;
    }
    if (result.record.granted === false) {
      apply(result.record);
      return;
    }
    setNotice('failed');
  }

  async function confirmOn() {
    if (busy || preview) return;
    setBusy(true);
    setNotice(null);
    const result = await grantAiConsent(eventId);
    setBusy(false);
    setConfirm(false);
    if (!result.ok) {
      setGranted(false);
      setNotice(noticeFor(result.status, result.ineligible));
      return;
    }
    if (result.record.granted === true) {
      apply(result.record);
      return;
    }
    setGranted(false);
    setNotice(result.record.capability.reason === 'not_contract_client' ? 'blocked' : 'failed');
  }

  function apply(record: { granted: boolean; capability: { canGrant: boolean; canWithdraw: boolean; reason: string | null } }) {
    setGranted(record.granted === true);
    setCanGrant(record.capability.canGrant);
    setCanWithdraw(record.capability.canWithdraw);
    setNotice(record.capability.reason === 'not_contract_client' ? 'blocked' : null);
  }

  const disabled = !ready || busy || notice === 'unavailable' || notice === 'blocked' || (granted ? !canWithdraw : !canGrant);

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('ai.headline')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('ai.body')}</Text>
      <Text onPress={onPrivacy} style={[Type.footnote, { color: c.accent }]}>
        {t('legal.privacyTitle')}
      </Text>
      <View style={row}>
        <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('ai.toggle')}</Text>
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
          accessibilityLabel={t('ai.toggle')}
        />
      </View>
      {notice === 'unavailable' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.unavailable')}</Text> : null}
      {notice === 'blocked' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.notContractClient')}</Text> : null}
      {notice === 'failed' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.failed')}</Text> : null}

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

const card = { borderRadius: Radius.lg, gap: 8 };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
