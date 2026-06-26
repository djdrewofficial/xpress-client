import { Stack } from 'expo-router';

import { SocialPrompt } from '@/components/SocialPrompt';

export default function AppLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Shows ~24h after first sign-in to collect IG/TikTok handles. */}
      <SocialPrompt />
    </>
  );
}
