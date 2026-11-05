import { useLayoutEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { FirstSongStep } from '@/components/onboarding/FirstSongStep';
import { MusicStep } from '@/components/onboarding/MusicStep';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { SignInScreen } from '@/components/sign-in/SignInScreen';
import { useT } from '@/lib/i18n';
import type { OtpTransport } from '@/lib/otp';
import type { WelcomeSnapshot } from '@/lib/welcome';

/**
 * Dev-only stills of this phase, with sample data. Not linked from the app.
 * Open /dev/phase2?frame=login|code|code-error|welcome|welcome-es|privacy|music|song
 */

const SAMPLE: WelcomeSnapshot = {
  names: 'Sample & Couple',
  date: '2027-06-12',
  venue: 'Sample Venue',
  progress: 43,
};

const fake: OtpTransport = {
  send: async () => ({ ok: true }),
  verify: async (_channel, _target, token) => token.replace(/\D/g, '') !== '482107',
};

export default function Phase2Preview() {
  const params = useLocalSearchParams<{ frame?: string }>();
  const frame = typeof params.frame === 'string' ? params.frame : 'login';
  const spanish = frame.endsWith('-es');
  const { setLocale } = useT();

  useLayoutEffect(() => {
    setLocale(spanish ? 'es' : 'en');
  }, [spanish, setLocale]);

  if (!__DEV__) return <Redirect href="/login" />;

  if (frame === 'code' || frame === 'code-es') {
    return (
      <SignInScreen
        transport={fake}
        initial={{ phase: 'code', phone: '(555) 555-0123', code: '482', seconds: 28, autoFocus: false }}
      />
    );
  }
  if (frame === 'code-error') {
    return (
      <SignInScreen
        transport={fake}
        initial={{ phase: 'code', phone: '(555) 555-0123', code: '482107', error: true, autoFocus: false }}
      />
    );
  }
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
  return <SignInScreen transport={fake} initial={{ phone: '(555) 555-0123' }} />;
}
