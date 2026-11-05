import { useEffect, useState } from 'react';
import { Modal } from 'react-native';

import { FirstSongStep } from '@/components/onboarding/FirstSongStep';
import { MusicStep } from '@/components/onboarding/MusicStep';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

/**
 * Replay of the music intro and the first-song step (help button on Home).
 * Welcome and the old tour slides are not part of this — Welcome is the
 * post-login gate, and Onboarding 1 was dropped as redundant.
 */
export function OnboardingTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const { event } = useEvent();
  const [step, setStep] = useState<'music' | 'song'>('music');

  useEffect(() => {
    if (visible) setStep('music');
  }, [visible]);

  const canSong = (profile?.accountType === 'client' || profile?.accountType === 'staff') && !!event;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {step === 'music' ? (
        <MusicStep onSkip={onClose} onContinue={() => (canSong ? setStep('song') : onClose())} />
      ) : (
        <FirstSongStep onSkip={onClose} onDone={onClose} />
      )}
    </Modal>
  );
}
