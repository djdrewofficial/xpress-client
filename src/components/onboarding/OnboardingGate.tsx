import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FirstSongStep } from '@/components/onboarding/FirstSongStep';
import { MusicStep } from '@/components/onboarding/MusicStep';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { loadOnboardingFlags, markTourDone } from '@/lib/preferences';

type Step = 'loading' | 'welcome' | 'music' | 'song' | 'app';

/**
 * First screen after sign-in for couples and guests: Welcome (language + legal),
 * then the music intro, then the first-song step for clients. Staff skip this
 * and land on the events list. The old multi-slide welcome tour is not shown.
 */
export function OnboardingGate({ children }: PropsWithChildren) {
  const c = useC();
  const { profile, session } = useAuth();
  const { event, loading: eventLoading } = useEvent();
  const [step, setStep] = useState<Step>('loading');
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current || !profile || !session) return;
    if (profile.accountType === 'staff') {
      decided.current = true;
      setStep('app');
      return;
    }
    if (eventLoading) return;
    let cancelled = false;
    loadOnboardingFlags(session.user.id)
      .then((flags) => {
        if (cancelled) return;
        decided.current = true;
        if (!flags.welcome) setStep('welcome');
        else if (!flags.tour) setStep('music');
        else setStep('app');
      })
      .catch(() => {
        if (!cancelled) {
          decided.current = true;
          setStep('welcome');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, session, eventLoading]);

  async function finishTour() {
    try {
      if (session) await markTourDone(session.user.id);
    } catch {
      // Entering the app matters more than the flag; Plan still has its own check.
    }
    setStep('app');
  }

  async function afterWelcome() {
    if (!session) {
      setStep('app');
      return;
    }
    const flags = await loadOnboardingFlags(session.user.id).catch(() => ({ welcome: true, tour: false }));
    setStep(flags.tour ? 'app' : 'music');
  }

  if (!profile || !session || step === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (step === 'welcome') return <WelcomeScreen onContinue={afterWelcome} />;

  if (step === 'music') {
    const canSong = (profile.accountType === 'client' || profile.accountType === 'staff') && !!event;
    return <MusicStep onSkip={finishTour} onContinue={() => (canSong ? setStep('song') : finishTour())} />;
  }

  if (step === 'song') return <FirstSongStep onSkip={finishTour} onDone={finishTour} />;

  return <>{children}</>;
}
