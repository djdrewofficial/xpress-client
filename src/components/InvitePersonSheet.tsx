import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, useC } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';
import { inviteGuest } from '@/lib/people';

const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const RELATIONSHIPS: { value: string; key: TranslationKey }[] = [
  { value: 'Partner', key: 'invite.partner' },
  { value: 'Fiancé(e)', key: 'invite.fiance' },
  { value: 'Wedding Planner', key: 'invite.planner' },
  { value: 'Parent', key: 'invite.parent' },
  { value: 'Sibling', key: 'invite.sibling' },
  { value: 'Friend', key: 'invite.friend' },
  { value: 'Other', key: 'invite.other' },
];

export function InvitePersonSheet({
  visible,
  eventId,
  onClose,
  onInvited,
  onSent,
}: {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onInvited?: () => void;
  /** Fired with the address after a successful send, once this sheet has closed. */
  onSent?: (email: string) => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFirst('');
    setLast('');
    setEmail('');
    setRelationship('');
    setErr(null);
    setBusy(false);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (busy) return;
    if (!first.trim() || !last.trim()) return setErr(t('invite.needNames'));
    if (!emailValid(email)) return setErr(t('invite.needEmail'));
    if (!relationship.trim()) return setErr(t('invite.needRel'));
    setErr(null);
    setBusy(true);
    const sentEmail = email.trim();
    const res = await inviteGuest({ eventId, firstName: first, lastName: last, email: sentEmail, relationship });
    setBusy(false);
    if (res.ok) {
      onInvited?.();
      reset();
      onClose();
      onSent?.(sentEmail);
    } else {
      setErr(res.error ?? t('invite.sendFail'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardProvider>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel={t('invite.close')}>
            <Pressable
              style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 16) }]}
              onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handle, { backgroundColor: c.ink3 }]} />
              <Text style={[Type.headline, { color: c.ink, marginBottom: 6 }]}>{t('invite.title')}</Text>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
                style={{ maxHeight: 520 }}>
                <Text style={[Type.footnote, { color: c.ink2 }]}>
                  {t('invite.help')}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Field label={t('invite.first')} style={{ flex: 1 }}>
                    <Input value={first} onChangeText={setFirst} placeholder={t('invite.firstPh')} autoCapitalize="words" />
                  </Field>
                  <Field label={t('invite.last')} style={{ flex: 1 }}>
                    <Input value={last} onChangeText={setLast} placeholder={t('invite.lastPh')} autoCapitalize="words" />
                  </Field>
                </View>

                <Field label={t('invite.email')}>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('invite.emailPh')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </Field>

                <Field label={t('invite.relationship')}>
                  <View style={styles.chips}>
                    {RELATIONSHIPS.map((r) => {
                      const active = relationship.trim().toLowerCase() === r.value.toLowerCase();
                      return (
                        <Pressable
                          key={r.value}
                          onPress={() => setRelationship(r.value === 'Other' ? '' : r.value)}
                          style={[
                            styles.chip,
                            active
                              ? { backgroundColor: c.accent, borderColor: c.accent }
                              : { backgroundColor: c.surface2, borderColor: c.line },
                          ]}>
                          <Text style={{ color: active ? c.onAccent : c.ink, fontFamily: Fonts.semibold, fontSize: 13 }}>{t(r.key)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Input
                    value={relationship}
                    onChangeText={setRelationship}
                    placeholder={t('invite.relPh')}
                    autoCapitalize="words"
                  />
                </Field>

                {err ? <Text style={[Type.footnote, { color: c.danger }]}>{err}</Text> : null}
                <Button label={busy ? t('invite.sending') : t('invite.send')} onPress={submit} disabled={busy} />
                {busy ? <ActivityIndicator color={c.accent} /> : null}
                <Button label={t('common.cancel')} variant="ghost" onPress={close} disabled={busy} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useC();
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={[Type.label, { color: c.accent }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: ComponentProps<typeof TextInput>) {
  const c = useC();
  return (
    <TextInput
      placeholderTextColor={c.ink3}
      {...props}
      style={[styles.input, { backgroundColor: c.surface, color: c.ink, borderColor: c.line }, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: Radius.pill, marginBottom: 14, opacity: 0.45 },
  input: {
    letterSpacing: 0,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
});
