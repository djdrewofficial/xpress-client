import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Email confirmation links land here. The session listener moves a signed-in person into the app. */
export default function ConfirmRoute() {
  const c = useC();
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      router.replace(session ? '/' : '/login');
    }, session ? 0 : 2500);
    return () => clearTimeout(timer);
  }, [loading, session, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}
