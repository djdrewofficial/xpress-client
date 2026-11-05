import { Stack } from 'expo-router';

import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { SocialPrompt } from '@/components/SocialPrompt';
import { EventProvider } from '@/lib/events';

// Everyone enters through the planner tabs; staff without a chosen event are
// bounced to the events list from there. Pin it so adding /events can't change it.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AppLayout() {
  return (
    <EventProvider>
      <OnboardingGate>
        <Stack screenOptions={{ headerShown: false }} />
        {/* Shows ~24h after first sign-in to collect IG/TikTok handles. */}
        <SocialPrompt />
      </OnboardingGate>
    </EventProvider>
  );
}
