import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardController, KeyboardEvents } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { Logo } from '@/components/Logo';
import { ContentColumn } from '@/components/ui';
import { MovingBlobs } from '@/components/MovingBlobs';
import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Fonts, Gradients, Radius, Type } from '@/lib/theme';

export function AuthFrame({
  title,
  subtitle,
  kicker = false,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  kicker?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [keyboardOpen, setKeyboardOpen] = useState(() => KeyboardController.isVisible());

  useEffect(() => {
    const show = KeyboardEvents.addListener('keyboardWillShow', (event) => {
      if (event.height > 0) setKeyboardOpen(true);
    });
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const kickerText = t('login.kicker');
  const [kickerBefore, kickerAfter = ''] = kickerText.split('{{accent}}');
  // The welcome headline is three lines (English and Spanish). A fixed 280pt
  // hero, clipped, with the panel pulled up 28pt, covered the last line.
  // Size that hero from the logo, the type, and the safe area instead.
  const showKicker = kicker && !keyboardOpen;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}>
          <View style={keyboardOpen ? { height: insets.top + 72, overflow: 'hidden' } : showKicker ? undefined : { height: 200, overflow: 'hidden' }}>
            <LinearGradient colors={[...Gradients.loginHero]} style={StyleSheet.absoluteFill} />
            <MovingBlobs />
            <SafeAreaView
              edges={['top']}
              style={[
                styles.heroInner,
                keyboardOpen && { flex: 1, justifyContent: 'center' },
                !keyboardOpen && !showKicker && { flex: 1, justifyContent: 'center', paddingBottom: PANEL_OVERLAP },
                showKicker && { paddingBottom: PANEL_OVERLAP + HERO_BREATH },
              ]}>
              <Logo variant="full" height={keyboardOpen ? 48 : 72} tone="#ffffff" />
              {showKicker ? (
                <Text style={kickerStyle}>
                  {kickerBefore}
                  <Text style={kickerAccentStyle}>{t('login.kickerAccent')}</Text>
                  {kickerAfter}
                </Text>
              ) : null}
            </SafeAreaView>
          </View>
          <View style={[styles.panel, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <ContentColumn fill>
              <View style={{ flexGrow: 1, gap: 16, paddingBottom: 8 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[styles.welcome, { color: c.ink }]}>{title}</Text>
                  {subtitle ? <Text style={[Type.body, { color: c.ink2 }]}>{subtitle}</Text> : null}
                </View>
                {children}
                {footer}
              </View>
            </ContentColumn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** How far the pale panel covers the hero. Matches `panel.marginTop`. */
const PANEL_OVERLAP = 28;
/** Purple left between the last headline line and the panel edge. */
const HERO_BREATH = 20;

const kickerStyle = {
  fontFamily: Fonts.display,
  fontSize: 34,
  lineHeight: 40,
  color: '#ffffff',
  textAlign: 'center' as const,
};
const kickerAccentStyle = {
  fontFamily: Fonts.displayItalic,
  fontSize: 34,
  lineHeight: 40,
  color: '#dbaae1',
};

const styles = StyleSheet.create({
  heroInner: { alignItems: 'center', paddingHorizontal: 24, gap: 14 },
  panel: {
    flexGrow: 1,
    marginTop: -PANEL_OVERLAP,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  welcome: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
});
