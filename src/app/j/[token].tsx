import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { stashPendingLink } from '@/lib/eventLinks';

/** Universal link and xpressclient://j/<token>. Stash, then sign in or redeem. */
export default function EventLinkRoute() {
  const c = useC();
  const router = useRouter();
  const { session, loading } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      if (token) await stashPendingLink(token);
      if (cancelled) return;
      router.replace(session ? '/' : '/login');
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, session, token, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}
