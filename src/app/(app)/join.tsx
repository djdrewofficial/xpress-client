import { useRouter } from 'expo-router';

import { JoinCodeScreen } from '@/components/JoinCodeScreen';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

/** "Have a join code?" from My Event or Home. Hosts and new logins only reach this from those links. */
export default function JoinRoute() {
  const router = useRouter();
  const { reloadProfile } = useAuth();
  const { focusEvent } = useEvent();

  return (
    <JoinCodeScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      onJoined={async (eventId) => {
        focusEvent(eventId);
        await reloadProfile();
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
