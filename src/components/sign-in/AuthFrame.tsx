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

  const heroH = keyboardOpen ? insets.top + 72 : kicker ? 280 : 200;
  const kickerText = t('login.kicker');
  const [kickerBefore, kickerAfter = ''] = kickerText.split('{{accent}}');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ height: heroH, overflow: 'hidden' }}>
          <LinearGradient colors={[...Gradients.loginHero]} style={StyleSheet.absoluteFill} />
          <MovingBlobs />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Logo variant="full" height={keyboardOpen ? 48 : 72} tone="#ffffff" />
            {kicker && !keyboardOpen ? (
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1, gap: 16, paddingBottom: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.welcome, { color: c.ink }]}>{title}</Text>
              {subtitle ? <Text style={[Type.body, { color: c.ink2 }]}>{subtitle}</Text> : null}
            </View>
            {children}
            {footer}
          </ScrollView>
          </ContentColumn>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  panel: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  welcome: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
});
