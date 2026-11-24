import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoModeBanner } from '@/components/DemoModeBanner';
import { TabBar, ThemeSchemeOverride, useC } from '@/components/ui';
import { useDevLocale } from '@/lib/devLocale';
import { useT } from '@/lib/i18n';
import { Fonts, Type } from '@/lib/theme';

/**
 * Dev-only Demo Mode banner stills. Not linked from the app.
 * Open /dev/demo-banner?frame=light|dark|light-es|dark-es
 */
export default function DemoBannerPreview() {
  useDevLocale();
  const params = useLocalSearchParams<{ frame?: string }>();
  const frame = typeof params.frame === 'string' ? params.frame : 'light';
  const spanish = frame.endsWith('-es');
  const dark = frame.startsWith('dark');
  const { setLocale } = useT();

  useLayoutEffect(() => {
    setLocale(spanish ? 'es' : 'en');
  }, [spanish, setLocale]);

  if (!__DEV__) return <Redirect href="/login" />;

  return (
    <SafeAreaProvider>
      <ThemeSchemeOverride scheme={dark ? 'dark' : 'light'}>
        <Preview />
      </ThemeSchemeOverride>
    </SafeAreaProvider>
  );
}

function Preview() {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 48, backgroundColor: c.bg }}>
        <DemoModeBanner />
      </View>
      <View style={{ flex: 1, padding: 24, gap: 8 }}>
        <Text style={[Type.overline, { color: c.red }]}>{t('home.greetEvening')}</Text>
        <Text style={{ fontFamily: Fonts.display, fontSize: 32, color: c.ink, lineHeight: 36 }}>
          Sample & Drew
        </Text>
        <Text style={[Type.body, { color: c.ink2 }]}>{t('home.chapters')}</Text>
      </View>
      <TabBar active="home" />
    </View>
  );
}
