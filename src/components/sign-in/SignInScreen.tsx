import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField, TextField } from '@/components/sign-in/fields';
import { LegalSheet } from '@/components/onboarding/LegalSheet';
import { Button, PolicyLinks, useC } from '@/components/ui';
import type { LegalDoc } from '@/lib/legal';
import { usePendingEventLink } from '@/lib/eventLinks';
import { resendConfirmation, signInWithEmail, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { signInWithApple, signInWithGoogle, type SocialResult } from '@/lib/socialAuth';
import { Type } from '@/lib/theme';

const ERROR_KEY: Record<EmailAuthError, TranslationKey> = {
  invalidEmail: 'login.emailInvalid',
  passwordRequired: 'login.passwordRequired',
  badCredentials: 'login.badCredentials',
  unconfirmed: 'login.unconfirmed',
  exists: 'login.badCredentials',
  weak: 'signup.short',
  rate: 'login.rateLimited',
  generic: 'login.genericError',
  expired: 'login.genericError',
  wrongCode: 'login.genericError',
  codeRejected: 'login.genericError',
  network: 'login.network',
  short: 'signup.short',
  letter: 'signup.letter',
  number: 'signup.number',
  email: 'signup.sameEmail',
  long: 'signup.long',
};

const SOCIAL_KEY: Record<Exclude<SocialResult, { ok: true }>['reason'], TranslationKey | null> = {
  cancelled: null,
  unavailable: 'login.socialUnavailable',
  missing: 'login.socialMissing',
  generic: 'login.socialFailed',
};

type Step = 'choices' | 'email';

export function SignInScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const pendingLink = usePendingEventLink();
  const [step, setStep] = useState<Step>('choices');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState<'social' | 'email' | null>(null);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  function back() {
    setStep('choices');
    setError(null);
    setNotice(null);
    setBusy(null);
  }

  async function submit() {
    if (busy) return;
    setBusy('email');
    setError(null);
    setNotice(null);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) setError(ERROR_KEY[result.error]);
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    if (busy) return;
    setBusy('email');
    setNotice(null);
    try {
      const result = await resendConfirmation(email);
      if (!result.ok) setError(ERROR_KEY[result.error]);
      else setNotice('login.resent');
    } finally {
      setBusy(null);
    }
  }

  async function chooseSocial(kind: 'apple' | 'google') {
    if (busy) return;
    setBusy('social');
    setError(null);
    setNotice(null);
    try {
      const result = kind === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (!result.ok) {
        const key = SOCIAL_KEY[result.reason];
        if (kind === 'apple' && result.reason === 'missing') setError('login.socialUnavailable');
        else if (key) setError(key);
      }
    } finally {
      setBusy(null);
    }
  }

  if (step === 'email') {
    return (
      <AuthFrame title={t('login.emailStep')} subtitle={t('login.emailStepSub')}>
        {pendingLink ? <Text style={[Type.footnote, { color: c.accent }]}>{t('login.pendingLink')}</Text> : null}
        <TextField
          label={t('login.emailLabel')}
          icon="mail"
          value={email}
          onChangeText={(value) => {
            setEmail(value.trim());
            setError(null);
          }}
          placeholder={t('login.emailPh')}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          error={error === 'login.emailInvalid'}
        />
        <PasswordField
          label={t('login.passwordLabel')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          placeholder={t('login.passwordPh')}
          textContentType="password"
          autoComplete="password"
          onSubmitEditing={submit}
          error={error === 'login.passwordRequired'}
        />
        {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
        {notice ? <Text style={[Type.footnote, { color: c.ink2 }]}>{t(notice)}</Text> : null}
        {error === 'login.unconfirmed' ? (
          <Pressable onPress={resend} hitSlop={8} disabled={busy != null}>
            <Text style={[Type.subhead, { color: c.accent }]}>{t('login.resend')}</Text>
          </Pressable>
        ) : null}
        <Button label={busy ? t('login.submitting') : t('login.submit')} onPress={submit} disabled={busy != null} />
        <Pressable onPress={() => router.push('/auth/forgot-password')} hitSlop={8}>
          <Text style={[Type.subhead, { color: c.accent, textAlign: 'center' }]}>{t('login.forgot')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
          <Text style={[Type.subhead, { color: c.ink, textAlign: 'center' }]}>{t('login.create')}</Text>
        </Pressable>
        <Button label={t('login.backChoices')} variant="ghost" onPress={back} disabled={busy != null} />
        <PolicyLinks onPrivacy={() => setLegal('privacy')} onTerms={() => setLegal('terms')} />
        <LegalSheet visible={legal != null} doc={legal} onClose={() => setLegal(null)} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame kicker title={t('login.welcome')} subtitle={t('login.subtitle')}>
      {pendingLink ? <Text style={[Type.footnote, { color: c.accent }]}>{t('login.pendingLink')}</Text> : null}
      {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
      <View style={{ gap: 12 }}>
        <Button label={t('login.choiceEmail')} variant="ghost" onPress={() => { setError(null); setStep('email'); }} disabled={busy != null} />
        <Button label={t('login.choiceGoogle')} variant="ghost" onPress={() => chooseSocial('google')} disabled={busy != null} />
        <Button label={t('login.choiceApple')} variant="ghost" onPress={() => chooseSocial('apple')} disabled={busy != null} />
      </View>
      <PolicyLinks note onPrivacy={() => setLegal('privacy')} onTerms={() => setLegal('terms')} />
      <LegalSheet visible={legal != null} doc={legal} onClose={() => setLegal(null)} />
    </AuthFrame>
  );
}
