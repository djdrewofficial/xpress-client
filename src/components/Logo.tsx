import { Image, StyleSheet, useColorScheme, View, type ImageStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useC } from '@/components/ui';
import { Space } from '@/lib/theme';

/* Xpress Entertainment logo. The source PNGs are solid-black on transparent, so
   we tint them per theme — near-black in light mode, white in dark mode. */

const SOURCES = {
  full: require('../assets/logo-full.png'),
  icon: require('../assets/logo-icon.png'),
};
const RATIO = { full: 2.293, icon: 0.976 }; // width / height

export function Logo({
  variant = 'full',
  height = 28,
  tone,
  style,
}: {
  variant?: 'full' | 'icon';
  height?: number;
  /** Override the tint (defaults to theme: near-black / white). */
  tone?: string;
  style?: ImageStyle;
}) {
  const scheme = useColorScheme();
  const color = tone ?? (scheme === 'dark' ? '#ffffff' : '#18181b');
  return (
    <Image
      source={SOURCES[variant]}
      tintColor={color}
      resizeMode="contain"
      style={[{ height, width: height * RATIO[variant] }, style]}
    />
  );
}

/** Slim branded "liquid glass" top bar: frosted blur, logo left, optional right slot. */
export function BrandHeader({ right }: { right?: React.ReactNode }) {
  const c = useC();
  const scheme = useColorScheme();
  return (
    <BlurView intensity={50} tint={scheme === 'dark' ? 'dark' : 'light'} style={[styles.header, { borderColor: c.border }]}>
      <Logo variant="full" height={22} />
      <View>{right}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
