import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  REPORT_REASONS,
  blockPerson,
  hideContent,
  removeEventGuest,
  submitReport,
  unblockPerson,
  type ModerationFailure,
  type ModerationKind,
  type ModerationTarget,
  type ReportReason,
} from '@/lib/moderation';
import { Radius, Type } from '@/lib/theme';

const KIND_KEY: Record<ModerationKind, 'safety.unavailable' | 'safety.forbidden' | 'safety.notFound' | 'safety.self' | 'safety.ownOnly' | 'safety.guestOnly' | 'safety.onlyGuest' | 'safety.failed' | 'safety.session'> = {
  unavailable: 'safety.unavailable',
  forbidden: 'safety.forbidden',
  notFound: 'safety.notFound',
  self: 'safety.self',
  ownOnly: 'safety.ownOnly',
  guestOnly: 'safety.guestOnly',
  onlyGuest: 'safety.onlyGuest',
  invalid: 'safety.failed',
  failed: 'safety.failed',
  session: 'safety.session',
};

/** One report sheet plus confirmations for block, hide, unblock, and guest removal. */
export function useModeration(eventId: string | null, onChanged?: () => void) {
  const { t } = useT();
  const c = useC();
  const [target, setTarget] = useState<ModerationTarget | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  function explain(result: ModerationFailure) {
    Alert.alert(t(KIND_KEY[result.kind]));
  }

  function openReport(next: ModerationTarget) {
    setReason(null);
    setDetails('');
    setTarget(next);
  }

  function closeReport() {
    if (busy) return;
    setTarget(null);
  }

  async function sendReport() {
    if (!eventId || !target || !reason || busy) return;
    setBusy(true);
    const result = await submitReport(eventId, target, reason, details);
    setBusy(false);
    if (!result.ok) {
      explain(result);
      return;
    }
    setTarget(null);
    Alert.alert(result.data.alreadyReported ? t('safety.already') : t('safety.sent'));
  }

  function askBlock(userId: string) {
    if (!eventId) return;
    Alert.alert(t('safety.confirmBlockTitle'), t('safety.confirmBlockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.block'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await blockPerson(eventId, userId);
            if (!result.ok) {
              explain(result);
              return;
            }
            Alert.alert(t('safety.blocked'));
            onChanged?.();
          })();
        },
      },
    ]);
  }

  function askUnblock(userId: string) {
    if (!eventId) return;
    Alert.alert(t('safety.confirmUnblockTitle'), t('safety.confirmUnblockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.unblock'),
        onPress: () => {
          void (async () => {
            const result = await unblockPerson(eventId, userId);
            if (!result.ok) {
              explain(result);
              return;
            }
            Alert.alert(t('safety.unblocked'));
            onChanged?.();
          })();
        },
      },
    ]);
  }

  function askHide(next: ModerationTarget) {
    if (!eventId) return;
    Alert.alert(t('safety.confirmHideTitle'), t('safety.confirmHideBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.remove'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await hideContent(eventId, next);
            if (!result.ok) {
              explain(result);
              return;
            }
            Alert.alert(t('safety.removed'));
            onChanged?.();
          })();
        },
      },
    ]);
  }

  function askRemoveGuest(userId: string) {
    if (!eventId) return;
    Alert.alert(t('safety.confirmGuestTitle'), t('safety.confirmGuestBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.removeGuest'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await removeEventGuest(eventId, userId);
            if (!result.ok) {
              explain(result);
              return;
            }
            Alert.alert(result.data.access === 'other' ? t('safety.guestOther') : t('safety.guestRemoved'));
            onChanged?.();
          })();
        },
      },
    ]);
  }

  const sheet = (
    <Sheet visible={target != null} onClose={closeReport} title={t('safety.reasonTitle')}>
      <View style={{ gap: 10 }}>
        {REPORT_REASONS.map((item) => {
          const selected = reason === item;
          const label = item === 'offensive'
            ? t('safety.reason.offensive')
            : item === 'spam'
              ? t('safety.reason.spam')
              : item === 'harassment'
                ? t('safety.reason.harassment')
                : t('safety.reason.other');
          return (
            <Pressable
              key={item}
              onPress={() => setReason(item)}
              accessibilityRole="button"
              style={[
                styles.reason,
                { borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.accentTint : c.surface },
              ]}>
              <Text style={[Type.callout, { color: c.ink }]}>{label}</Text>
            </Pressable>
          );
        })}
        <TextInput
          value={details}
          onChangeText={(value) => setDetails(value.slice(0, 1000))}
          placeholder={t('safety.details')}
          placeholderTextColor={c.ink3}
          multiline
          maxLength={1000}
          style={[styles.details, { color: c.ink, borderColor: c.line, backgroundColor: c.surface2 }]}
        />
        <Pressable
          onPress={() => { void sendReport(); }}
          disabled={!reason || busy}
          accessibilityRole="button"
          style={[styles.send, { backgroundColor: c.accent, opacity: !reason || busy ? 0.4 : 1 }]}>
          <Text style={[Type.button, { color: '#fff' }]}>{t('safety.send')}</Text>
        </Pressable>
      </View>
    </Sheet>
  );

  return { sheet, openReport, askBlock, askUnblock, askHide, askRemoveGuest, explain };
}

const styles = StyleSheet.create({
  reason: { borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 14 },
  details: { minHeight: 88, borderWidth: 1, borderRadius: Radius.md, padding: 12, textAlignVertical: 'top' },
  send: { borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
