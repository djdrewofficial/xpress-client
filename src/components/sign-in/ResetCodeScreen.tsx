import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';

import { AuthFrame } from '@/components/sign-in/AuthFrame';
import { OneTimeCodeField } from '@/components/sign-in/fields';
import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { sendPasswordReset, verifyRecoveryCode, type EmailAuthError } from '@/lib/emailAuth';
import { useT, type TranslationKey } from '@/lib/i18n';
import {
  normalizeRecoveryCode,
  recoveryCodeReady,
  resendCooldownRemaining,
} from '@/lib/recoveryCode';
import { Type } from '@/lib/theme';

const CODE_ERROR: Record<EmailAuthError, TranslationKey> = {
  invalidEmail: 'login.emailInvalid',
  passwordRequired: 'login.genericError',
  badCredentials: 'reset.codeRejected',
  unconfirmed: 'reset.codeRejected',
  exists: 'reset.codeRejected',
  weak: 'login.genericError',
  rate: 'login.rateLimited',
  generic: 'login.genericError',
  expired: 'reset.expiredCode',
  short: 'reset.codeLength',
  letter: 'reset.codeLength',
  number: 'reset.codeLength',
  email: 'reset.codeLength',
  long: 'reset.codeLength',
  wrongCode: 'reset.wrongCode',
  codeRejected: 'reset.codeRejected',
  network: 'login.network',
};

export function ResetCodeScreen({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const c = useC();
  const { t } = useT();
  const { markPasswordReset } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const cooldown = resendCooldownRemaining(sentAt, now);
  const ready = recoveryCodeReady(code);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  async function submit(raw = code) {
    if (lock.current) return;
    const digits = normalizeRecoveryCode(raw);
    if (!recoveryCodeReady(digits)) {
      setNotice(null);
      setError('reset.codeLength');
      return;
    }
    lock.current = true;
    setBusy('verify');
    setError(null);
    setNotice(null);
    try {
      const result = await verifyRecoveryCode(email, digits);
      if (!result.ok) {
        setError(CODE_ERROR[result.error]);
        return;
      }
      markPasswordReset(result.userId);
    } catch {
      if (alive.current) setError('login.network');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  async function resend() {
    if (lock.current || cooldown > 0) return;
    lock.current = true;
    setBusy('resend');
    setError(null);
    setNotice(null);
    try {
      const result = await sendPasswordReset(email);
      if (!result.ok) {
        setError(CODE_ERROR[result.error]);
        return;
      }
      setCode('');
      setSentAt(Date.now());
      setNow(Date.now());
      setNotice('reset.resent');
    } catch {
      if (alive.current) setError('login.network');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(null);
    }
  }

  function onCode(value: string) {
    const next = normalizeRecoveryCode(value);
    const jumped = next.length - code.length > 1;
    setCode(next);
    setError(null);
    setNotice(null);
    if (jumped && recoveryCodeReady(next)) void submit(next);
  }

  return (
    <AuthFrame title={t('reset.codeTitle')} subtitle={t('reset.codeBody', { email })}>
      <OneTimeCodeField
        label={t('reset.codeLabel')}
        value={code}
        onChangeText={onCode}
        placeholder={t('reset.codePh')}
        error={error != null}
        editable={busy == null}
        autoFocus
      />
      {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
      {notice && !error ? (
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t(notice, { email })}</Text>
      ) : null}
      <Button
        label={busy === 'verify' ? t('reset.codeChecking') : t('reset.codeSubmit')}
        onPress={() => void submit()}
        disabled={busy != null || !ready}
      />
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => void resend()}
          hitSlop={8}
          disabled={busy != null || cooldown > 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy != null || cooldown > 0 }}>
          <Text style={[Type.subhead, { color: cooldown > 0 || busy ? c.ink3 : c.accent, textAlign: 'center' }]}>
            {busy === 'resend'
              ? t('forgot.sending')
              : cooldown > 0
                ? t('reset.resendWait', { seconds: cooldown })
                : t('reset.resend')}
          </Text>
        </Pressable>
        <Pressable onPress={onChangeEmail} hitSlop={8} disabled={busy != null} accessibilityRole="button">
          <Text style={[Type.subhead, { color: busy ? c.ink3 : c.accent, textAlign: 'center' }]}>{t('reset.changeEmail')}</Text>
        </Pressable>
      </View>
    </AuthFrame>
  );
}
