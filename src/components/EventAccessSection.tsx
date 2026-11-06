import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, SegmentedControl, useC } from '@/components/ui';
import { initials } from '@/components/eventDisplay';
import {
  configuredAppLink,
  contactLine,
  createEventInvite,
  deliveryLines,
  getJoinCode,
  inviteErrorKind,
  listEventAccess,
  removeEventMember,
  resendEventInvite,
  resetJoinCode,
  revokeEventInvite,
  type DeliveryLine,
  type EventInvite,
  type EventMember,
  type InviteErrorKind,
  type JoinCode,
} from '@/lib/eventAccess';
import { localeTag, useT, type TranslationKey } from '@/lib/i18n';
import { emailLooksValid, formatUSPhone, toE164 } from '@/lib/phone';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

const DELIVERY_KEY: Record<DeliveryLine, TranslationKey> = {
  textSent: 'people.textSent',
  textFailed: 'people.textFailed',
  textFailedTryEmail: 'people.textFailedTryEmail',
  emailSent: 'people.emailSent',
  emailFailed: 'people.emailFailed',
};

const INVITE_ERROR_KEY: Record<InviteErrorKind, TranslationKey> = {
  already: 'people.already',
  own: 'people.ownContact',
  phone: 'people.badPhone',
  contact: 'people.needContact',
  setup: 'people.setup',
  revoked: 'people.revokedResend',
  joined: 'people.alreadyJoined',
  protected: 'people.cantRemove',
  missing: 'people.notFound',
  generic: 'people.actionFail',
};

/**
 * Host-only block on My Event: people with a login, pending invites, and the join code.
 * Guests never mount this.
 */
export function EventAccessSection({
  eventId,
  revision,
  onHaveCode,
}: {
  eventId: string;
  revision: number;
  onHaveCode?: () => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  const [members, setMembers] = useState<EventMember[]>([]);
  const [invites, setInvites] = useState<EventInvite[]>([]);
  const [code, setCode] = useState<JoinCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [people, join] = await Promise.all([listEventAccess(eventId), getJoinCode(eventId)]);
    if (people.ok) {
      setMembers(people.data.members);
      setInvites(people.data.invites);
      setPeopleError(null);
    } else {
      setPeopleError(t(people.status === 503 ? 'people.setup' : 'people.loadFail'));
    }
    if (join.ok && join.data.code) {
      setCode(join.data);
      setCodeError(null);
    } else {
      setCode(null);
      const status = join.ok ? 0 : join.status;
      setCodeError(t(status === 503 ? 'people.setup' : 'code.loadFail'));
    }
    setLoading(false);
  }, [eventId, t]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, revision]);

  function roleLabel(role: string, holder: boolean): string {
    if (holder || role.trim().toLowerCase() === 'contract holder') return t('people.holder');
    if (role.trim().toLowerCase() === 'partner') return t('people.partner');
    return role.trim();
  }

  function sayDelivery(lines: DeliveryLine[], accepted: boolean) {
    const parts = lines.map((line) => t(DELIVERY_KEY[line]));
    if (accepted) parts.unshift(t('people.joined'));
    setNotice(parts.join('\n') || (accepted ? t('people.joined') : null));
  }

  async function resend(invite: EventInvite) {
    if (busyId) return;
    setBusyId(invite.id);
    setNotice(null);
    const result = await resendEventInvite(eventId, invite.id);
    setBusyId(null);
    if (!result.ok) {
      setNotice(t(INVITE_ERROR_KEY[inviteErrorKind(result.status, result.error)]));
      return;
    }
    sayDelivery(deliveryLines(result.data.delivery), result.data.status === 'accepted');
    await load();
  }

  function revoke(invite: EventInvite) {
    const name = invite.name?.trim() || contactLine(invite.phone, invite.email) || t('people.partner');
    Alert.alert(t('people.revokeTitle'), t('people.revokeBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('people.revoke'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(invite.id);
          const result = await revokeEventInvite(eventId, invite.id);
          setBusyId(null);
          if (!result.ok) {
            setNotice(t(INVITE_ERROR_KEY[inviteErrorKind(result.status, result.error)]));
            return;
          }
          setNotice(null);
          await load();
        },
      },
    ]);
  }

  function remove(member: EventMember) {
    const name = member.name.trim() || t('people.partner');
    Alert.alert(t('people.removeTitle', { name }), t('people.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('people.remove'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(member.clientId);
          const result = await removeEventMember(eventId, member.clientId);
          setBusyId(null);
          if (!result.ok) {
            setNotice(t(INVITE_ERROR_KEY[inviteErrorKind(result.status, result.error)]));
            return;
          }
          setNotice(null);
          await load();
        },
      },
    ]);
  }

  async function copyCode() {
    if (!code?.code) return;
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice(t('code.copyFail'));
    }
  }

  async function shareCode() {
    if (!code?.code) return;
    const link = configuredAppLink();
    const message = link
      ? t('code.shareBodyLink', { code: code.code, link })
      : t('code.shareBody', { code: code.code });
    try {
      await Share.share({ message });
    } catch {
      /* the sheet was dismissed */
    }
  }

  function resetCode() {
    Alert.alert(t('code.resetTitle'), t('code.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('code.reset'),
        style: 'destructive',
        onPress: async () => {
          setBusyId('code');
          const result = await resetJoinCode(eventId);
          setBusyId(null);
          if (!result.ok || !result.data.code) {
            setCodeError(t(!result.ok && result.status === 503 ? 'people.setup' : 'code.resetFail'));
            return;
          }
          setCode(result.data);
          setCodeError(null);
          setCopied(false);
        },
      },
    ]);
  }

  const expiry = code?.expiresAt ? formatExpiry(code.expiresAt, locale) : null;

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Text style={[Type.label, { color: c.ink3 }]}>{t('people.title')}</Text>
        <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
          {loading ? (
            <View style={styles.pad}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : peopleError ? (
            <View style={styles.pad}>
              <Text style={[Type.footnote, { color: c.ink2 }]}>{peopleError}</Text>
            </View>
          ) : (
            <>
              {members.length === 0 && invites.length === 0 ? (
                <View style={styles.pad}>
                  <Text style={[Type.footnote, { color: c.ink2 }]}>{t('people.empty')}</Text>
                </View>
              ) : null}
              {members.map((member, index) => (
                <View key={member.clientId}>
                  {index > 0 ? <View style={[styles.div, { backgroundColor: c.line }]} /> : null}
                  <PersonRow
                    name={member.name.trim() || t('people.partner')}
                    detail={[roleLabel(member.role, member.isContractHolder), contactLine(member.phone, member.email)].filter(Boolean).join(' · ')}
                    action={member.canRemove ? t('people.remove') : null}
                    danger
                    busy={busyId === member.clientId}
                    onAction={() => remove(member)}
                  />
                </View>
              ))}
              {invites.map((invite, index) => (
                <View key={invite.id}>
                  {members.length > 0 || index > 0 ? <View style={[styles.div, { backgroundColor: c.line }]} /> : null}
                  <PersonRow
                    name={invite.name?.trim() || contactLine(invite.phone, invite.email) || t('people.partner')}
                    detail={[roleLabel(invite.role, false), invite.status === 'expired' ? t('people.expired') : t('people.pending')].filter(Boolean).join(' · ')}
                    action={t('people.resend')}
                    secondary={t('people.revoke')}
                    busy={busyId === invite.id}
                    onAction={() => resend(invite)}
                    onSecondary={() => revoke(invite)}
                  />
                </View>
              ))}
              {members.length > 0 || invites.length > 0 ? <View style={[styles.div, { backgroundColor: c.line }]} /> : null}
              <Pressable
                onPress={() => setInviteOpen(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.cell, pressed ? { backgroundColor: c.surface2 } : null]}>
                <View style={[styles.bubble, { backgroundColor: c.accentTint }]}>
                  <Icon name="plus" size={18} color={c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cellTitle, { color: c.ink }]}>{t('people.invite')}</Text>
                  <Text style={[Type.footnote, { color: c.ink2 }]}>{t('people.inviteSub')}</Text>
                </View>
                <Icon name="chev-r" size={18} color={c.ink3} />
              </Pressable>
            </>
          )}
        </View>
        {notice ? <Text style={[Type.footnote, { color: c.ink2 }]}>{notice}</Text> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[Type.label, { color: c.ink3 }]}>{t('code.title')}</Text>
        <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, padding: 16, gap: 12 }]}>
          <Text style={[Type.footnote, { color: c.ink2 }]}>{t('code.help')}</Text>
          {loading && !code ? (
            <ActivityIndicator color={c.accent} />
          ) : code?.code ? (
            <Text selectable style={[styles.code, { color: c.ink }]}>
              {code.code}
            </Text>
          ) : null}
          {expiry ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('code.expires', { date: expiry })}</Text> : null}
          {codeError ? <Text style={[Type.footnote, { color: c.danger }]}>{codeError}</Text> : null}
          {code?.code ? (
            <View style={{ gap: 8 }}>
              <View style={styles.row}>
                <Button label={copied ? t('code.copied') : t('code.copy')} variant="secondary" onPress={copyCode} style={{ flex: 1 }} />
                <Button label={t('code.share')} variant="secondary" onPress={shareCode} style={{ flex: 1 }} />
              </View>
              <Button label={busyId === 'code' ? t('common.saving') : t('code.reset')} variant="ghost" onPress={resetCode} disabled={busyId === 'code'} />
            </View>
          ) : null}
        </View>
        {onHaveCode ? (
          <Pressable onPress={onHaveCode} accessibilityRole="link" hitSlop={8} style={styles.linkHit}>
            <Text style={[Type.callout, { color: c.accent, textAlign: 'center' }]}>{t('join.haveCode')}</Text>
          </Pressable>
        ) : null}
      </View>

      <InvitePartnerSheet
        visible={inviteOpen}
        eventId={eventId}
        onClose={() => setInviteOpen(false)}
        onDone={async (message) => {
          setNotice(message);
          await load();
        }}
      />
    </View>
  );
}

function PersonRow({
  name,
  detail,
  action,
  secondary,
  danger,
  busy,
  onAction,
  onSecondary,
}: {
  name: string;
  detail: string;
  action: string | null;
  secondary?: string;
  danger?: boolean;
  busy: boolean;
  onAction: () => void;
  onSecondary?: () => void;
}) {
  const c = useC();
  return (
    <View style={styles.cell}>
      <View style={[styles.bubble, { backgroundColor: c.accentTint }]}>
        <Text style={[styles.initials, { color: c.accent }]}>{initials(name)}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View>
          <Text style={[styles.cellTitle, { color: c.ink }]} numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>
        {action ? (
          <View style={styles.actions}>
            <Pressable onPress={onAction} disabled={busy} accessibilityRole="button" hitSlop={6}>
              <Text style={[styles.action, { color: danger ? c.red : c.accent, opacity: busy ? 0.4 : 1 }]}>{action}</Text>
            </Pressable>
            {secondary && onSecondary ? (
              <Pressable onPress={onSecondary} disabled={busy} accessibilityRole="button" hitSlop={6}>
                <Text style={[styles.action, { color: c.red, opacity: busy ? 0.4 : 1 }]}>{secondary}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function InvitePartnerSheet({
  visible,
  eventId,
  onClose,
  onDone,
}: {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const c = useC();
  const { t, locale } = useT();
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setChannel('phone');
    setName('');
    setPhone('');
    setEmail('');
    setErr(null);
    setResult(null);
    setBusy(false);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function submit() {
    if (busy) return;
    const sentPhone = channel === 'phone' ? toE164(phone) : null;
    const sentEmail = channel === 'email' ? email.trim().toLowerCase() : '';
    if (channel === 'phone' && !sentPhone) return setErr(t('people.badPhone'));
    if (channel === 'email' && !emailLooksValid(sentEmail)) return setErr(t('people.badEmail'));
    setErr(null);
    setBusy(true);
    const res = await createEventInvite(eventId, {
      phone: sentPhone ?? undefined,
      email: sentEmail || undefined,
      name: name.trim() || undefined,
      lang: locale,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(t(INVITE_ERROR_KEY[inviteErrorKind(res.status, res.error)]));
      return;
    }
    const lines = deliveryLines(res.data.delivery).map((line) => t(DELIVERY_KEY[line]));
    if (res.data.status === 'accepted') lines.unshift(t('people.joined'));
    setResult(lines.join('\n') || t('people.joined'));
  }

  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Pressable
            style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: c.ink3 }]} />
            <Text style={[Type.headline, { color: c.ink, marginBottom: 12 }]}>{t('people.inviteTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 8 }} style={{ maxHeight: 520 }}>
              {result ? (
                <>
                  <Text style={[Type.body, { color: c.ink }]}>{result}</Text>
                  <Button
                    label={t('common.done')}
                    onPress={() => {
                      const message = result;
                      reset();
                      onClose();
                      onDone(message);
                    }}
                  />
                </>
              ) : (
                <>
                  <Text style={[Type.footnote, { color: c.ink2 }]}>
                    {channel === 'phone' ? t('people.helpPhone') : t('people.helpEmail')}
                  </Text>
                  <SegmentedControl
                    options={[
                      { value: 'phone', label: t('login.phoneLabel') },
                      { value: 'email', label: t('login.emailLabel') },
                    ]}
                    value={channel}
                    onChange={(next) => {
                      setChannel(next);
                      setErr(null);
                    }}
                  />
                  <Field label={t('people.name')}>
                    <Input value={name} onChangeText={setName} placeholder={t('people.namePh')} autoCapitalize="words" />
                  </Field>
                  {channel === 'phone' ? (
                    <Field label={t('login.phoneLabel')}>
                      <Input
                        value={phone}
                        onChangeText={(value) => setPhone(formatUSPhone(value))}
                        placeholder={t('login.phonePh')}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </Field>
                  ) : (
                    <Field label={t('login.emailLabel')}>
                      <Input
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t('login.emailPh')}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        autoComplete="email"
                      />
                    </Field>
                  )}
                  {err ? <Text style={[Type.footnote, { color: c.danger }]}>{err}</Text> : null}
                  <Button label={busy ? t('people.sending') : t('people.send')} onPress={submit} disabled={busy} />
                  <Button label={t('common.cancel')} variant="ghost" onPress={close} disabled={busy} />
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const c = useC();
  return (
    <View style={{ gap: 6 }}>
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
      style={[styles.input, { backgroundColor: c.bg, color: c.ink, borderColor: c.line }, props.style]}
    />
  );
}

function formatExpiry(iso: string, locale: 'en' | 'es'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: 'medium' }).format(date);
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  pad: { paddingHorizontal: 14, paddingVertical: 14 },
  div: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: Fonts.bold, fontSize: 13 },
  cellTitle: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { fontFamily: Fonts.semibold, fontSize: 14 },
  code: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: 2, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  linkHit: { paddingVertical: 6 },
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
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    fontFamily: Fonts.body,
  },
});
