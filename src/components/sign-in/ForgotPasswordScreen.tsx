import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { TextField } from '@/components/sign-in/fields';
import { Button, useC } from '@/components/ui';
import { sendPasswordReset, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Type } from '@/lib/theme';

const ERROR_KEY: Record<EmailAuthError, TranslationKey> = {
  invalidEmail: 'login.emailInvalid',
  passwordRequired: 'login.passwordRequired',
  badCredentials: 'login.genericError',
  unconfirmed: 'login.unconfirmed',
  exists: 'login.genericError',
  weak: 'signup.short',
  rate: 'login.rateLimited',
  generic: 'login.genericError',
  expired: 'login.genericError',
  short: 'signup.short',
  letter: 'signup.letter',
  number: 'signup.number',
  email: 'signup.sameEmail',
  long: 'signup.long',
};

export function ForgotPasswordScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendPasswordReset(email);
      if (!result.ok) setError(ERROR_KEY[result.error]);
      else setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthFrame title={t('forgot.sentTitle')} subtitle={t('forgot.sentBody', { email: email.trim() })}>
        <Button label={t('forgot.back')} onPress={() => router.replace('/login')} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
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
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
      <Button label={busy ? t('forgot.sending') : t('forgot.submit')} onPress={submit} disabled={busy} />
      <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
        <Text style={[Type.subhead, { color: c.accent, textAlign: 'center' }]}>{t('forgot.back')}</Text>
      </Pressable>
    </AuthFrame>
  );
}
