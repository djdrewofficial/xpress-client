import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { authAdoptInflight, subscribeAuthAdopt } from '@/lib/recoveryLink';

/** Email confirmation links land here. A recovery link continues on the new-password screen. */
export default function ConfirmRoute() {
  const c = useC();
  const router = useRouter();
  const { session, loading, pendingPasswordReset } = useAuth();
  const [adopting, setAdopting] = useState(() => authAdoptInflight());

  useEffect(() => subscribeAuthAdopt(() => setAdopting(authAdoptInflight())), []);

  useEffect(() => {
    if (loading || adopting) return;
    if (pendingPasswordReset) {
      router.replace('/auth/reset');
      return;
    }
    const timer = setTimeout(() => {
      router.replace(session ? '/' : '/login');
    }, session ? 0 : 2500);
    return () => clearTimeout(timer);
  }, [loading, adopting, session, pendingPasswordReset, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}
