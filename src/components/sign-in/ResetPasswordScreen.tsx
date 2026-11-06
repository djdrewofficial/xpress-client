import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField } from '@/components/sign-in/fields';
import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { saveNewPassword, type EmailAuthError } from '@/lib/emailAuth';
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
  short: 'signup.short',
  letter: 'signup.letter',
  number: 'signup.number',
  email: 'signup.sameEmail',
  long: 'signup.long',
};

export function ResetPasswordScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const { session, clearPasswordReset, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (password !== confirm) {
      setError('signup.mismatch');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await saveNewPassword(password, session?.user.email ?? '');
      if (!result.ok) {
        setError(ERROR_KEY[result.error]);
        return;
      }
      clearPasswordReset();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <AuthFrame title={t('reset.title')} subtitle={t('reset.invalid')}>
        <Button label={t('reset.request')} onPress={() => router.replace('/auth/forgot-password')} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={t('reset.title')} subtitle={t('reset.subtitle')}>
      <PasswordField
        label={t('login.passwordLabel')}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
        placeholder={t('signup.passwordPh')}
        textContentType="newPassword"
        autoComplete="password-new"
        returnKeyType="next"
      />
      <PasswordField
        label={t('signup.confirmLabel')}
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          setError(null);
        }}
        placeholder={t('signup.passwordPh')}
        textContentType="newPassword"
        autoComplete="password-new"
        onSubmitEditing={submit}
      />
      {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
      <Button label={busy ? t('reset.saving') : t('reset.submit')} onPress={submit} disabled={busy} />
      <Pressable onPress={() => signOut()} hitSlop={8} disabled={busy}>
        <Text style={[Type.subhead, { color: c.ink3, textAlign: 'center' }]}>{t('event.signOut')}</Text>
      </Pressable>
    </AuthFrame>
  );
}
