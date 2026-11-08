import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField } from '@/components/sign-in/fields';
import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { saveNewPassword, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { passwordErrorAfterEdit, passwordFieldsIssue, valuesForPasswordSubmit, type PasswordFormIssue } from '@/lib/passwords';
import { resetExitAction } from '@/lib/recoveryGate';
import { authAdoptInflight, subscribeAuthAdopt } from '@/lib/recoveryLink';
import { Type } from '@/lib/theme';

const ERROR_KEY: Record<EmailAuthError, TranslationKey> = {
  invalidEmail: 'login.emailInvalid',
  passwordRequired: 'login.passwordRequired',
  badCredentials: 'login.genericError',
  unconfirmed: 'login.unconfirmed',
  exists: 'login.genericError',
  weak: 'signup.weak',
  rate: 'login.rateLimited',
  generic: 'login.genericError',
  expired: 'reset.invalid',
  wrongCode: 'login.genericError',
  codeRejected: 'login.genericError',
  network: 'login.network',
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
  const [shown, setShown] = useState<PasswordFormIssue | { field: 'form'; key: TranslationKey } | null>(null);
  const passwordRef = useRef('');
  const confirmRef = useRef('');
  const [busy, setBusy] = useState(false);
  const [adopting, setAdopting] = useState(() => authAdoptInflight());

  useEffect(() => subscribeAuthAdopt(() => setAdopting(authAdoptInflight())), []);

  function messageFor(issue: NonNullable<ReturnType<typeof passwordFieldsIssue>>): TranslationKey {
    if (issue.issue === 'mismatch') return 'signup.mismatch';
    return ERROR_KEY[issue.issue];
  }

  function followText(passwordValue: string, confirmValue: string) {
    setShown((current) => {
      if (!current) return null;
      if ('key' in current) return null;
      return passwordErrorAfterEdit(current, passwordValue, confirmValue, session?.user.email ?? '');
    });
  }

  function notePassword(value: string) {
    passwordRef.current = value;
    setPassword(value);
    followText(value, confirmRef.current);
  }

  function noteConfirm(value: string) {
    confirmRef.current = value;
    setConfirm(value);
    followText(passwordRef.current, value);
  }

  async function submit(confirmFromKeyboard?: string | null) {
    if (busy || !session || !pendingPasswordReset) return;
    const values = valuesForPasswordSubmit({
      password: passwordRef.current,
      confirm: confirmRef.current,
      confirmFromKeyboard,
    });
    passwordRef.current = values.password;
    confirmRef.current = values.confirm;
    setPassword(values.password);
    setConfirm(values.confirm);
    const issue = passwordFieldsIssue(values.password, values.confirm, session.user.email ?? '');
    if (issue) {
      setShown(issue);
      return;
    }
    setBusy(true);
    setShown(null);
    try {
      const result = await saveNewPassword(values.password, session.user.email ?? '');
      if (!result.ok) {
        if (result.error === 'short' || result.error === 'letter' || result.error === 'number' || result.error === 'email' || result.error === 'long') {
          setShown({ field: 'password', issue: result.error });
        } else if (result.error === 'weak') {
          setShown({ field: 'form', key: 'signup.weak' });
        } else {
          setShown({ field: 'form', key: ERROR_KEY[result.error] });
        }
        return;
      }
      clearPasswordReset();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  const exit = resetExitAction({
    hasSession: !!session,
    pendingPasswordReset,
    loading,
    adopting,
  });
  if (exit === 'wait') {
    return (
      <AuthFrame title={t('reset.title')} subtitle={t('reset.checking')}>
        <ActivityIndicator color={c.accent} />
      </AuthFrame>
    );
  }
  if (exit === 'invalid-home' || exit === 'invalid-request') {
    return (
      <AuthFrame title={t('reset.title')} subtitle={t('reset.invalid')}>
        {exit === 'invalid-home' ? (
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
        onChangeText={notePassword}
        placeholder={t('signup.passwordPh')}
        textContentType="newPassword"
        autoComplete="password-new"
        returnKeyType="next"
        error={shown?.field === 'password'}
      />
      {shown?.field === 'password' && 'issue' in shown ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(messageFor(shown))}</Text> : null}
      <PasswordField
        label={t('signup.confirmLabel')}
        value={confirm}
        onChangeText={noteConfirm}
        placeholder={t('signup.passwordPh')}
        textContentType="newPassword"
        autoComplete="password-new"
        onSubmitEditing={(text) => void submit(text)}
        error={shown?.field === 'confirm'}
      />
      {shown?.field === 'confirm' && 'issue' in shown ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(messageFor(shown))}</Text> : null}
      {shown && 'key' in shown ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(shown.key)}</Text> : null}
      <Button label={busy ? t('reset.saving') : t('reset.submit')} onPress={() => void submit()} disabled={busy} />
      <Pressable onPress={() => signOut()} hitSlop={8} disabled={busy}>
        <Text style={[Type.subhead, { color: c.ink3, textAlign: 'center' }]}>{t('event.signOut')}</Text>
      </Pressable>
    </AuthFrame>
  );
}
