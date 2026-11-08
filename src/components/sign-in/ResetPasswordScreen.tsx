import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField } from '@/components/sign-in/fields';
import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { saveNewPassword, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { newPasswordIssue } from '@/lib/passwords';
import { authAdoptInflight, subscribeAuthAdopt } from '@/lib/recoveryLink';
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
  expired: 'reset.invalid',
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
  const { session, loading, pendingPasswordReset, clearPasswordReset, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [adopting, setAdopting] = useState(() => authAdoptInflight());

  useEffect(() => subscribeAuthAdopt(() => setAdopting(authAdoptInflight())), []);

  async function submit() {
    if (busy || !session || !pendingPasswordReset) return;
    const issue = newPasswordIssue(password, confirm, session.user.email ?? '');
    if (issue) {
      setError(issue === 'mismatch' ? 'signup.mismatch' : ERROR_KEY[issue]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await saveNewPassword(password, session.user.email ?? '');
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

  if (!session || !pendingPasswordReset) {
    if (loading || adopting) {
      return (
        <AuthFrame title={t('reset.title')} subtitle={t('reset.checking')}>
          <ActivityIndicator color={c.accent} />
        </AuthFrame>
      );
    }
    return (
      <AuthFrame title={t('reset.title')} subtitle={t('reset.invalid')}>
        {session ? (
          <Button label={t('login.backChoices')} onPress={() => router.replace('/')} />
        ) : (
          <Button label={t('reset.request')} onPress={() => router.replace('/auth/forgot-password')} />
        )}
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
