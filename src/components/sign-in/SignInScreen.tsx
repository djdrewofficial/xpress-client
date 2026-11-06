import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField, TextField } from '@/components/sign-in/fields';
import { SocialButtons } from '@/components/sign-in/SocialButtons';
import { Button, useC } from '@/components/ui';
import { usePendingEventLink } from '@/lib/eventLinks';
import { resendConfirmation, signInWithEmail, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
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
  short: 'signup.short',
  letter: 'signup.letter',
  number: 'signup.number',
  email: 'signup.sameEmail',
  long: 'signup.long',
};

export function SignInScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const pendingLink = usePendingEventLink();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) setError(ERROR_KEY[result.error]);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await resendConfirmation(email);
      if (!result.ok) setError(ERROR_KEY[result.error]);
      else setNotice('login.resent');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame kicker title={t('login.welcome')} subtitle={t('login.subtitle')}>
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
        <Pressable onPress={resend} hitSlop={8} disabled={busy}>
          <Text style={[Type.subhead, { color: c.accent }]}>{t('login.resend')}</Text>
        </Pressable>
      ) : null}
      <Button label={busy ? t('login.submitting') : t('login.submit')} onPress={submit} disabled={busy} />
      <Pressable onPress={() => router.push('/auth/forgot-password')} hitSlop={8}>
        <Text style={[Type.subhead, { color: c.accent, textAlign: 'center' }]}>{t('login.forgot')}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
        <Text style={[Type.subhead, { color: c.ink, textAlign: 'center' }]}>{t('login.create')}</Text>
      </Pressable>
      <SocialButtons
        onError={(key) => {
          setNotice(null);
          setError(key);
        }}
      />
    </AuthFrame>
  );
}
