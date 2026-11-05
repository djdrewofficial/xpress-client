import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardController, KeyboardEvents } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { MovingBlobs } from '@/components/MovingBlobs';
import { Logo } from '@/components/Logo';
import { Button, CodeInput, Icon, SegmentedControl, useC } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { emailLooksValid, formatUSPhone, maskEmail, maskPhone, toE164 } from '@/lib/phone';
import { liveOtp, type OtpChannel, type OtpTransport, type SendCodeResult } from '@/lib/otp';
import { Fonts, Gradients, Radius, Type } from '@/lib/theme';

/**
 * Passwordless sign-in. Text is the default; Email is the alternate.
 * Staff use this same screen — there is no separate password or 2FA form.
 */

export type SignInInitial = {
  phase?: 'form' | 'code';
  channel?: OtpChannel;
  phone?: string;
  email?: string;
  code?: string;
  error?: boolean;
  seconds?: number;
  /** Dev stills pass false so a software keyboard doesn't cover the code row. */
  autoFocus?: boolean;
};

const RESEND_SECONDS = 30;

const SEND_ERROR: Record<Exclude<SendCodeResult, { ok: true }>['reason'], TranslationKey> = {
  invalid: 'login.genericError',
  missing: 'login.missing',
  sms: 'login.smsUnavailable',
  email: 'login.emailFailed',
  rate: 'login.rateLimited',
  generic: 'login.genericError',
};

function formatCountdown(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SignInScreen({ transport = liveOtp, initial }: { transport?: OtpTransport; initial?: SignInInitial }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { height, width } = useWindowDimensions();
  const [phase, setPhase] = useState<'form' | 'code'>(initial?.phase ?? 'form');
  const [channel, setChannel] = useState<OtpChannel>(initial?.channel ?? 'phone');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [codeError, setCodeError] = useState(initial?.error ?? false);
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(initial?.seconds ?? RESEND_SECONDS);
  const [keyboardOpen, setKeyboardOpen] = useState(() => KeyboardController.isVisible());
  const scrollRef = useRef<ScrollView>(null);

  // Full-bleed screen (no nav header), so KeyboardAvoidingView's offset stays 0.
  // The hero is a fixed slice of the window — leave it expanded and the send
  // button lands under the keypad. Phone-pad has no return key to dismiss it.
  const expandedHero = phase === 'code' ? Math.round(height * 0.32) : Math.round(height * 0.46);
  const heroH = keyboardOpen ? insets.top + 72 : expandedHero;
  const target = channel === 'phone' ? phone : email;
  const canSend = channel === 'phone' ? !!toE164(phone) : emailLooksValid(email);

  useEffect(() => {
    if (phase !== 'code' || codeError || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, codeError, seconds]);

  useEffect(() => {
    const show = KeyboardEvents.addListener('keyboardWillShow', (e) => {
      if (e.height > 0) setKeyboardOpen(true);
    });
    const didShow = KeyboardEvents.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    // Expand only after the keyboard is gone so the button isn't covered mid-dismiss.
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => {
      show.remove();
      didShow.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardOpen) return;
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [keyboardOpen, phase, channel, formError, codeError]);

  function switchChannel(next: OtpChannel) {
    setChannel(next);
    setFormError(null);
  }

  async function send(from: 'form' | 'resend') {
    if (busy) return;
    if (channel === 'phone' && !toE164(phone)) {
      setFormError('login.phoneInvalid');
      return;
    }
    if (channel === 'email' && !emailLooksValid(email)) {
      setFormError('login.emailInvalid');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const result = await transport.send(channel, target);
      if (!result.ok) {
        const key = result.reason === 'invalid'
          ? channel === 'phone' ? 'login.phoneInvalid' : 'login.emailInvalid'
          : SEND_ERROR[result.reason];
        setFormError(key);
        if (from === 'resend') setCodeError(false);
        return;
      }
      setCode('');
      setCodeError(false);
      setSeconds(RESEND_SECONDS);
      setPhase('code');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy || code.length < 6) return;
    setBusy(true);
    setFormError(null);
    try {
      const ok = await transport.verify(channel, target, code);
      if (!ok) setCodeError(true);
      // A session update swaps the root navigator off this screen.
    } finally {
      setBusy(false);
    }
  }

  function useDifferent() {
    setPhase('form');
    setCode('');
    setCodeError(false);
    setFormError(null);
    setBusy(false);
  }

  const masked = channel === 'phone' ? maskPhone(phone) : maskEmail(email);
  const kicker = t('login.kicker');
  const [kickerBefore, kickerAfter = ''] = kicker.split('{{accent}}');
  const boxScale = Math.min(1, (width - 40) / (50 * 6 + 8 * 5));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ height: heroH, overflow: 'hidden' }}>
          <LinearGradient colors={[...Gradients.loginHero]} style={StyleSheet.absoluteFill} />
          <MovingBlobs />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Logo variant="full" height={keyboardOpen ? 48 : phase === 'code' ? 64 : 84} tone="#ffffff" />
            {phase === 'form' && !keyboardOpen ? (
              <Text style={kickerStyle}>
                {kickerBefore}
                <Text style={kickerAccentStyle}>{t('login.kickerAccent')}</Text>
                {kickerAfter}
              </Text>
            ) : null}
          </SafeAreaView>
          {keyboardOpen ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => { KeyboardController.dismiss(); }}
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
            />
          ) : null}
        </View>

        <View style={[styles.panel, { backgroundColor: c.bg, paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 12) }]}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={false}
            contentContainerStyle={{ flexGrow: 1, gap: 16 }}>
          {phase === 'form' ? (
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.welcome, { color: c.ink }]}>{t('login.welcome')}</Text>
                <Text style={[Type.body, { color: c.ink2 }]}>{t('login.subtitle')}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'email' as const, label: t('login.email') },
                  { value: 'phone' as const, label: t('login.text') },
                ]}
                value={channel}
                onChange={switchChannel}
              />
              <View style={{ gap: 6 }}>
                <Text style={[Type.label, { color: c.accent }]}>
                  {channel === 'phone' ? t('login.phoneLabel') : t('login.emailLabel')}
                </Text>
                <View style={[styles.field, { backgroundColor: c.surface, borderColor: focused ? c.red : c.line }]}>
                  <Icon name={channel === 'phone' ? 'phone' : 'mail'} size={22} color={c.ink3} />
                  <TextInput
                    value={channel === 'phone' ? phone : email}
                    onChangeText={(text) => {
                      setFormError(null);
                      if (channel === 'phone') setPhone(formatUSPhone(text));
                      else setEmail(text.trimStart());
                    }}
                    placeholder={channel === 'phone' ? t('login.phonePh') : t('login.emailPh')}
                    placeholderTextColor={c.ink3}
                    keyboardType={channel === 'phone' ? 'phone-pad' : 'email-address'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={channel === 'phone' ? 'tel' : 'email'}
                    textContentType={channel === 'phone' ? 'telephoneNumber' : 'emailAddress'}
                    returnKeyType={channel === 'email' ? 'send' : 'done'}
                    blurOnSubmit
                    onSubmitEditing={() => send('form')}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={[styles.input, { color: c.ink }]}
                  />
                </View>
              </View>
              {formError ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(formError)}</Text> : null}
              {formError === 'login.smsUnavailable' ? (
                <Pressable onPress={() => switchChannel('email')} hitSlop={8}>
                  <Text style={[Type.subhead, { color: c.accent }]}>{t('login.useEmail')}</Text>
                </Pressable>
              ) : null}
              <Button
                label={busy ? t('login.sending') : t('login.send')}
                disabled={!canSend || busy}
                onPress={() => send('form')}
              />
              <Text style={[Type.footnote, styles.invite, { color: c.ink3 }]}>{t('login.invite')}</Text>
            </View>
          ) : (
              <View style={{ gap: 16 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[Type.overline, { color: c.red }]}>
                    {channel === 'phone' ? t('code.texts') : t('code.email')}
                  </Text>
                  <Text style={[styles.welcome, { color: c.ink }]}>{t('code.title')}</Text>
                  <Text style={[Type.body, { color: c.ink2 }]}>{t('code.sent', { dest: masked })}</Text>
                </View>
                <View style={{ transform: [{ scale: boxScale }], alignSelf: boxScale < 1 ? 'center' : 'auto' }}>
                  <CodeInput
                    value={code}
                    autoFocus={initial?.autoFocus ?? !initial}
                    error={codeError ? t('code.wrong') : null}
                    onChange={(next) => {
                      setCode(next);
                      if (codeError) setCodeError(false);
                    }}
                  />
                </View>
                {formError && !codeError ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(formError)}</Text> : null}
                {codeError ? (
                  <Button label={busy ? t('login.sending') : t('code.resend')} disabled={busy} onPress={() => send('resend')} />
                ) : (
                  <Button
                    label={busy ? t('code.verifying') : t('code.verify')}
                    disabled={code.length < 6 || busy}
                    onPress={verify}
                  />
                )}
                {!codeError ? (
                  seconds > 0 ? (
                    <Text style={[Type.footnote, styles.center, { color: c.ink3 }]}>
                      {t('code.resendIn', { time: formatCountdown(seconds) })}
                    </Text>
                  ) : (
                    <Pressable onPress={() => send('resend')} disabled={busy} hitSlop={8}>
                      <Text style={[Type.subhead, styles.center, { color: c.accent }]}>{t('code.resend')}</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
          )}
          </ScrollView>
          {phase === 'code' ? (
            <Pressable onPress={useDifferent} hitSlop={10} style={styles.switchBtn}>
              <Text style={[Type.label, styles.center, { color: c.red }]}>{t('code.switch')}</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const kickerStyle = {
  fontFamily: Fonts.display,
  fontSize: 40,
  lineHeight: 46,
  color: '#ffffff',
  textAlign: 'center' as const,
};
const kickerAccentStyle = {
  fontFamily: Fonts.displayItalic,
  fontSize: 40,
  lineHeight: 46,
  color: '#dbaae1',
};

const styles = StyleSheet.create({
  heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 18 },
  panel: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  welcome: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
  field: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 16, paddingVertical: 0 },
  invite: { textAlign: 'center' },
  center: { textAlign: 'center' },
  switchBtn: { paddingVertical: 14 },
});
