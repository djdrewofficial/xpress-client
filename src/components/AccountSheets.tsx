import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import { Type } from '@/lib/theme';
import { useC } from '@/components/ui/useC';

const SUPPORT_EMAIL = 'Events@xpressdjs.com';

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
  const working = phase === 'working';
  const title =
    phase === 'done' ? 'Account deleted' : phase === 'error' ? 'Something went wrong' : 'Delete your account?';
  const body =
    phase === 'done'
      ? `Your account has been deleted. To return, email ${SUPPORT_EMAIL} for a new invite.`
      : phase === 'error'
        ? `We couldn't delete your account. Please try again, or email ${SUPPORT_EMAIL}.`
        : `This permanently deletes your login and removes your access to this event. To use the app again you'll need a new invite — email ${SUPPORT_EMAIL}.`;

  const dismiss = () => {
    if (working) return;
    if (phase === 'done') onDone();
    else onClose();
  };

  return (
    <Sheet visible={visible} onClose={dismiss} title={title}>
      <Text style={[Type.footnote, styles.body, { color: c.ink2 }]}>{body}</Text>
      <View style={styles.actions}>
        {phase === 'confirm' || phase === 'working' ? (
          <>
            <Button label={working ? 'Deleting…' : 'Delete account'} onPress={onConfirm} disabled={working} />
            <Button label="Cancel" variant="ghost" onPress={onClose} disabled={working} />
            {working ? <ActivityIndicator color={c.red} style={styles.spin} /> : null}
          </>
        ) : (
          <Button label="OK" onPress={phase === 'done' ? onDone : onClose} />
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
  return (
    <Sheet visible={visible} onClose={onClose} title="Invite sent">
      <Text style={[Type.footnote, styles.body, { color: c.ink2 }]}>
        We emailed {email} a link to set their password and join your event.
      </Text>
      <Button label="Done" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: 16 },
  actions: { gap: 10 },
  spin: { marginTop: 4 },
});
