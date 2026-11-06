import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { JoinCodeScreen } from '@/components/JoinCodeScreen';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

/**
 * After sign-in, claim has already run inside auth (before this mounts).
 * A client or a brand-new login with no event lands on the join-code screen
 * instead of an empty planner. Staff and guests keep their existing doors.
 * A claim that linked events still opens the planner, even if the list is briefly empty.
 */
export function SignedInGate({ children }: PropsWithChildren) {
  const c = useC();
  const { profile, claim, reloadProfile } = useAuth();
  const { events, loading, focusEvent } = useEvent();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  if (!profile || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const blocked = profile.accountType === 'staff' || profile.accountType === 'event_guest' || claim.reason === 'staff' || claim.reason === 'guest';
  const showJoin = !blocked && events.length === 0 && claim.reason !== 'linked';

  if (showJoin) {
    return (
      <JoinCodeScreen
        allowSignOut
        onRefresh={() => reloadProfile({ claim: true })}
        onJoined={async (eventId) => {
          focusEvent(eventId);
          await reloadProfile();
        }}
      />
    );
  }

  return <>{children}</>;
}
