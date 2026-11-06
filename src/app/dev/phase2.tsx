import { useLayoutEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { JoinEventScreen } from '@/components/JoinEventScreen';
import { FirstSongStep } from '@/components/onboarding/FirstSongStep';
import { MusicStep } from '@/components/onboarding/MusicStep';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { ForgotPasswordScreen } from '@/components/sign-in/ForgotPasswordScreen';
import { SignInScreen } from '@/components/sign-in/SignInScreen';
import { SignUpScreen } from '@/components/sign-in/SignUpScreen';
import { useDevLocale } from '@/lib/devLocale';
import { useT } from '@/lib/i18n';
import type { WelcomeSnapshot } from '@/lib/welcome';

/**
 * Dev-only stills. Not linked from the app.
 * Open /dev/phase2?frame=login|signup|forgot|join|welcome|welcome-es|privacy|music|song
 */

const SAMPLE: WelcomeSnapshot = {
  names: 'Sample & Couple',
  date: '2027-06-12',
  venue: 'Sample Venue',
  progress: 43,
};

export default function Phase2Preview() {
  useDevLocale();
  const params = useLocalSearchParams<{ frame?: string }>();
  const frame = typeof params.frame === 'string' ? params.frame : 'login';
  const spanish = frame.endsWith('-es');
  const { setLocale } = useT();

  useLayoutEffect(() => {
    setLocale(spanish ? 'es' : 'en');
  }, [spanish, setLocale]);

  if (!__DEV__) return <Redirect href="/login" />;

  if (frame === 'signup' || frame === 'signup-es') return <SignUpScreen />;
  if (frame === 'forgot' || frame === 'forgot-es') return <ForgotPasswordScreen />;
  if (frame === 'join' || frame === 'join-es') return <JoinEventScreen onJoined={async () => {}} />;
  if (frame === 'welcome' || frame === 'welcome-es') {
    return <WelcomeScreen preview={SAMPLE} onContinue={() => {}} />;
  }
  if (frame === 'privacy' || frame === 'privacy-es') {
    return <WelcomeScreen preview={SAMPLE} initialSheet="privacy" onContinue={() => {}} />;
  }
  if (frame === 'music' || frame === 'music-es') {
    return <MusicStep onSkip={() => {}} onContinue={() => {}} />;
  }
  if (frame === 'song') {
    return <FirstSongStep preview onSkip={() => {}} onDone={() => {}} />;
  }
  return <SignInScreen />;
}
