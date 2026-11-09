import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Button, Sheet, useC } from '@/components/ui';
import { grantAiConsent, loadAiConsent, withdrawAiConsent, type AiConsentResult } from '@/lib/aiConsent';
import {
  consentFromRead,
  loadingConsent,
  settleConsentWrite,
  type ConsentRead,
  type ConsentUi,
} from '@/lib/consentState';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/** Contract-client host only. The switch appears only after a server read confirms it. */
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
  const [ui, setUi] = useState<ConsentUi>(loadingConsent());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    if (preview) {
      setUi({ phase: 'known', granted: false, canGrant: true, canWithdraw: false, notice: null });
      return;
    }
    const ticket = ++gen.current;
    setUi(loadingConsent());
    loadAiConsent(eventId).then((result) => {
      if (gen.current !== ticket) return;
      setUi(consentFromRead(asRead(result), 'ai'));
    });
    return () => { gen.current += 1; };
  }, [eventId, preview, reloadSignal]);

  async function write(intent: 'grant' | 'withdraw') {
    if (busy || preview || ui.phase !== 'known') return;
    if (intent === 'grant' && !ui.canGrant) return;
    if (intent === 'withdraw' && (!ui.granted || !ui.canWithdraw)) return;
    const ticket = ++gen.current;
    setBusy(true);
    setConfirm(false);
    const next = await settleConsentWrite({
      previous: ui,
      kind: 'ai',
      intent,
      write: async () => asRead(intent === 'grant' ? await grantAiConsent(eventId) : await withdrawAiConsent(eventId)),
      read: async () => asRead(await loadAiConsent(eventId)),
      isCurrent: () => gen.current === ticket,
    });
    if (gen.current !== ticket) return;
    if (next) setUi(next);
    setBusy(false);
  }

  const known = ui.phase === 'known';
  const disabled = !known || busy || ui.notice === 'blocked' || (ui.granted ? !ui.canWithdraw : !ui.canGrant);

  return (
    <View style={[card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }]}>
      <Text style={[title, { color: c.ink }]}>{t('ai.headline')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('ai.body')}</Text>
      <Text onPress={onPrivacy} style={[Type.footnote, { color: c.accent }]}>
        {t('legal.privacyTitle')}
      </Text>
      {known ? (
        <View style={row}>
          <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{t('ai.toggle')}</Text>
          <Switch
            value={ui.granted === true}
            disabled={disabled}
            onValueChange={(next) => {
              if (disabled) return;
              if (next) setConfirm(true);
              else void write('withdraw');
            }}
            trackColor={{ false: c.sunken, true: c.accent }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.sunken}
            accessibilityLabel={t('ai.toggle')}
          />
        </View>
      ) : (
        <Text style={[Type.footnote, { color: c.ink2 }]}>
          {ui.phase === 'loading' ? t('ai.checking') : ui.notice === 'unconfirmed' ? t('ai.unconfirmed') : t('ai.unread')}
        </Text>
      )}
      {ui.notice === 'unavailable' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.unavailable')}</Text> : null}
      {ui.notice === 'blocked' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.notContractClient')}</Text> : null}
      {ui.notice === 'failed' ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.failed')}</Text> : null}
      {ui.phase === 'unknown' ? (
        <Pressable onPress={() => void reload()} accessibilityRole="button">
          <Text style={[Type.footnote, { color: c.accent }]}>{t('common.tryAgain')}</Text>
        </Pressable>
      ) : null}

      <Sheet visible={confirm} onClose={() => { if (!busy) setConfirm(false); }} title={t('ai.confirmTitle')}>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t('ai.body')}</Text>
        <View style={{ height: 12 }} />
        <Button label={busy ? t('ai.saving') : t('ai.allow')} onPress={() => void write('grant')} disabled={busy} />
        <View style={{ height: 8 }} />
        <Button label={t('ai.notNow')} variant="ghost" onPress={() => setConfirm(false)} disabled={busy} />
      </Sheet>
    </View>
  );

  async function reload() {
    const ticket = ++gen.current;
    setUi(loadingConsent());
    const result = await loadAiConsent(eventId);
    if (gen.current !== ticket) return;
    setUi(consentFromRead(asRead(result), 'ai'));
  }
}

function asRead(result: AiConsentResult): ConsentRead {
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

const card = { borderRadius: Radius.lg, gap: 8 };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const title = { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 };
