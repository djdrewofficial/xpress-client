import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { Icon, PlayPauseIcon, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { resolvePreview } from '@/lib/musicSearch';

type PreviewTarget = {
  id: string;
  title: string;
  artist?: string | null;
  previewUrl?: string | null;
};

/** One shared expo-audio player for a song list (ideas, moment tracks, etc.). */
export function useSongPreviewPlayer() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(
    () => () => {
      try {
        player.pause();
      } catch {
        /* already stopped */
      }
    },
    [player],
  );

  useEffect(() => {
    if (status.didJustFinish) setPlayingId(null);
  }, [status.didJustFinish]);

  const togglePlay = useCallback(
    async (target: PreviewTarget) => {
      if (playingId === target.id) {
        try {
          player.pause();
        } catch {
          /* already stopped */
        }
        setPlayingId(null);
        return;
      }
      let url = target.previewUrl ?? null;
      if (!url) url = await resolvePreview(target.title, target.artist ?? '');
      if (!url) {
        setPlayingId(null);
        return;
      }
      try {
        player.replace({ uri: url });
        player.seekTo(0);
        player.play();
        setPlayingId(target.id);
      } catch {
        setPlayingId(null);
      }
    },
    [playingId, player],
  );

  return { playingId, togglePlay };
}

/**
 * Artwork thumbnail with a play/pause overlay (same look as Add music / SectionSongs).
 * Pressing play must not start a parent swipe — keep the control as its own Pressable.
 */
export function SongArtPlay({
  title,
  artworkUrl,
  playing,
  onPress,
  size = 46,
}: {
  title: string;
  artworkUrl?: string | null;
  playing: boolean;
  onPress: () => void;
  size?: number;
}) {
  const c = useC();
  const { t } = useT();
  const radius = Math.max(8, Math.round(size / 6));
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={t('add.previewA11y', { title })}
      style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
      {artworkUrl ? (
        <Image source={{ uri: artworkUrl }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <LinearGradient
          colors={[c.accent, '#2a1a52']}
          style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="music" size={Math.round(size * 0.4)} color="#fff" />
        </LinearGradient>
      )}
      <View style={[styles.overlay, { borderRadius: radius }]}>
        <PlayPauseIcon playing={playing} size={Math.round(size * 0.32)} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
