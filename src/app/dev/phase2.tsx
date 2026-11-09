import { useLayoutEffect, type ReactNode } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
 * Open /dev/phase2?frame=login|signup|forgot|join|welcome|welcome-es|welcome-large|welcome-large-es|welcome-locked|welcome-offers|welcome-offers-es|privacy|music|song
 * Welcome stills accept chrome=iphone|ipad for device insets. Sample data only.
 */

const SAMPLE: WelcomeSnapshot = {
  names: 'Alex',
  date: '2027-06-12',
  venue: 'Sample Venue',
  progress: 43,
};

const IPHONE_METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const IPAD_METRICS = {
  frame: { x: 0, y: 0, width: 834, height: 1194 },
  insets: { top: 24, left: 0, right: 0, bottom: 20 },
};

function PreviewFrame({ children }: { children: ReactNode }) {
  const { chrome } = useLocalSearchParams<{ chrome?: string }>();
  const value = Array.isArray(chrome) ? chrome[0] : chrome;
  if (value !== 'iphone' && value !== 'ipad') return children;
  return (
    <SafeAreaProvider initialMetrics={value === 'ipad' ? IPAD_METRICS : IPHONE_METRICS}>
      {children}
    </SafeAreaProvider>
  );
}

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
  if (
    frame === 'welcome' ||
    frame === 'welcome-es' ||
    frame === 'welcome-large' ||
    frame === 'welcome-large-es' ||
    frame === 'welcome-offers' ||
    frame === 'welcome-offers-es' ||
    frame === 'welcome-locked' ||
    frame === 'welcome-locked-es'
  ) {
    return (
      <PreviewFrame>
        <WelcomeScreen
          preview={SAMPLE}
          previewSms={frame.startsWith('welcome-offers')}
          previewLocked={frame.startsWith('welcome-locked')}
          previewFontScale={frame.includes('large') ? 1.35 : 1}
          onContinue={() => {}}
        />
      </PreviewFrame>
    );
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
