import { View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/* Small brand marks for a song's source. Rendered inline (react-native-svg) so
   no image assets are needed. Spotify uses its official green logo; Apple Music
   uses its app-icon (gradient tile + beamed note); YouTube a red play tile.
   Anything else (recommendations / manual entries) renders nothing. */

export type SongProvider = 'spotify' | 'apple' | 'youtube' | 'manual';

export function ProviderLogo({ provider, size = 14 }: { provider?: SongProvider | null; size?: number }) {
  if (provider === 'spotify') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Spotify">
        <Path
          fill="#1DB954"
          d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
        />
      </Svg>
    );
  }
  if (provider === 'apple') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Apple Music">
        <Defs>
          <LinearGradient id="am" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FB5C74" />
            <Stop offset="1" stopColor="#FA233B" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="24" height="24" rx="5.5" fill="url(#am)" />
        {/* beamed eighth-note (𝅘𝅥𝅮𝅘𝅥𝅮) */}
        <Path fill="#fff" d="M9.6 8.7 L16.8 7.2 L16.8 9.1 L9.6 10.6 Z" />
        <Rect x="9.05" y="9.2" width="1.4" height="6.4" fill="#fff" />
        <Rect x="15.4" y="7.8" width="1.4" height="6.4" fill="#fff" />
        <Ellipse cx="8.1" cy="15.7" rx="2.15" ry="1.7" fill="#fff" />
        <Ellipse cx="14.45" cy="14.3" rx="2.15" ry="1.7" fill="#fff" />
      </Svg>
    );
  }
  if (provider === 'youtube') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="YouTube">
        <Rect x="0" y="3" width="24" height="18" rx="5" fill="#FF0000" />
        <Path fill="#fff" d="M9.6 8.2 L16.4 12 L9.6 15.8 Z" />
      </Svg>
    );
  }
  return null;
}

/** A row of both service marks — used as a "we support these" cue. */
export function ProviderLogoRow({ size = 18, gap = 8 }: { size?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <ProviderLogo provider="spotify" size={size} />
      <ProviderLogo provider="apple" size={size} />
    </View>
  );
}
