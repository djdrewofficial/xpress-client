import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { PasswordField, TextField } from '@/components/sign-in/fields';
import { SocialButtons } from '@/components/sign-in/SocialButtons';
import { LegalSheet } from '@/components/onboarding/LegalSheet';
import { Button, PolicyLinks, useC } from '@/components/ui';
import type { LegalDoc } from '@/lib/legal';
import { usePendingEventLink } from '@/lib/eventLinks';
import { signUpWithEmail, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Type } from '@/lib/theme';

const ERROR_KEY: Record<EmailAuthError, TranslationKey> = {
  invalidEmail: 'login.emailInvalid',
  passwordRequired: 'login.passwordRequired',
  badCredentials: 'login.genericError',
  unconfirmed: 'signup.checkTitle',
  exists: 'signup.exists',
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

export function SignUpScreen() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const pendingLink = usePendingEventLink();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  async function submit() {
    if (busy) return;
    if (password !== confirm) {
      setError('signup.mismatch');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signUpWithEmail(email, password);
      if (!result.ok) setError(ERROR_KEY[result.error]);
      else if (result.needsConfirmation) setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthFrame title={t('signup.checkTitle')} subtitle={t('signup.checkBody', { email: email.trim() })}>
        <Button label={t('signup.back')} onPress={() => router.replace('/login')} />
        <PolicyLinks onPrivacy={() => setLegal('privacy')} onTerms={() => setLegal('terms')} />
        <LegalSheet visible={legal != null} doc={legal} onClose={() => setLegal(null)} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={t('signup.title')} subtitle={t('signup.subtitle')}>
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
      />
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
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('reset.subtitle')}</Text>
      {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
      <Button label={busy ? t('signup.submitting') : t('signup.submit')} onPress={submit} disabled={busy} />
      <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
        <Text style={[Type.subhead, { color: c.accent, textAlign: 'center' }]}>{t('signup.haveAccount')}</Text>
      </Pressable>
      <SocialButtons
        onError={(key) => {
          setError(key);
        }}
      />
      <PolicyLinks note onPrivacy={() => setLegal('privacy')} onTerms={() => setLegal('terms')} />
      <LegalSheet visible={legal != null} doc={legal} onClose={() => setLegal(null)} />
    </AuthFrame>
  );
}
