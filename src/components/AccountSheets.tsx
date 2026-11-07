import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Type } from '@/lib/theme';
import { useC } from '@/components/ui/useC';

export function DeleteAccountSheet({
  visible,
  phase,
  onClose,
  onConfirm,
  onDone,
}: {
  visible: boolean;
  phase: 'confirm' | 'working' | 'done' | 'error';
  onClose: () => void;
  onConfirm: () => void;
  onDone: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const working = phase === 'working';
  const title =
    phase === 'done' ? t('event.deletedTitle') : phase === 'error' ? t('event.deleteError') : t('event.deleteTitle');
  const body =
    phase === 'done' ? t('event.deletedBody') : phase === 'error' ? t('event.deleteFailBody') : t('event.deleteBody');

  const dismiss = () => {
    if (working) return;
    if (phase === 'done') onDone();
    else onClose();
  };

  return (
    <Sheet visible={visible} onClose={dismiss} title={title}>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 8 }}>
        <Text style={[Type.footnote, styles.body, { color: c.ink2 }]}>{body}</Text>
      </ScrollView>
      <View style={styles.actions}>
        {phase === 'confirm' || phase === 'working' ? (
          <>
            <Button label={t('event.keepAccount')} variant="ghost" onPress={onClose} disabled={working} />
            <Button label={working ? t('event.deleting') : t('event.deleteBtn')} onPress={onConfirm} disabled={working} />
            {working ? <ActivityIndicator color={c.red} style={styles.spin} /> : null}
          </>
        ) : (
          <Button label={t('common.done')} onPress={phase === 'done' ? onDone : onClose} />
        )}
      </View>
    </Sheet>
  );
}

export function InviteSentSheet({
  visible,
  email,
  onClose,
}: {
  visible: boolean;
  email: string;
  onClose: () => void;
}) {
  const c = useC();
  const { t } = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('event.inviteSent')}>
      <Text style={[Type.footnote, styles.body, { color: c.ink2 }]}>
        {t('event.inviteSentBody', { email })}
      </Text>
      <Button label={t('common.done')} onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: 16 },
  actions: { gap: 10 },
  spin: { marginTop: 4 },
});
