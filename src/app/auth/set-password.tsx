import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { authAdoptInflight, subscribeAuthAdopt } from '@/lib/recoveryLink';
import { Type } from '@/lib/theme';

/**
 * Legacy invite and reset links (xpressclient://auth/set-password).
 * IncomingLinks exchanges the code. A recovery session continues on the new-password screen.
 */
export default function SetPasswordScreen() {
  const router = useRouter();
  const c = useC();
  const { t } = useT();
  const { session, loading, pendingPasswordReset } = useAuth();
  const [adopting, setAdopting] = useState(() => authAdoptInflight());

  useEffect(() => subscribeAuthAdopt(() => setAdopting(authAdoptInflight())), []);

  useEffect(() => {
    if (adopting) return;
    if (pendingPasswordReset) {
      router.replace('/auth/reset');
      return;
    }
    if (loading) return;
    if (session) {
      router.replace('/');
      return;
    }
    const timer = setTimeout(() => router.replace('/login'), 4000);
    return () => clearTimeout(timer);
  }, [loading, adopting, session, pendingPasswordReset, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={c.accent} />
      <Text style={[Type.callout, { color: c.ink2 }]}>{t('auth.signingIn')}</Text>
    </View>
  );
}
