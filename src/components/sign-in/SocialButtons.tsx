import { useEffect, useState, type ComponentType } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useC, useScheme } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { signInWithApple, signInWithGoogle, type SocialResult } from '@/lib/socialAuth';
import { Fonts, Radius, Type } from '@/lib/theme';

const RESULT_KEY: Record<Exclude<SocialResult, { ok: true }>['reason'], TranslationKey | null> = {
  cancelled: null,
  unavailable: 'login.socialUnavailable',
  missing: 'login.socialMissing',
  generic: 'login.socialFailed',
};

/**
 * Apple and Google sit together. App Store guideline 4.8: if Google is offered,
 * Sign in with Apple must be offered too, at the same size. Android does not
 * show Google without Apple.
 */
export function SocialButtons({ onError }: { onError: (key: TranslationKey | null) => void }) {
  const c = useC();
  const scheme = useScheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [AppleButton, setAppleButton] = useState<ComponentType<{
    buttonType: number;
    buttonStyle: number;
    cornerRadius: number;
    style: { width: number; height: number };
    onPress: () => void;
  }> | null>(null);
  const [appleType, setAppleType] = useState<number | null>(null);
  const [appleStyle, setAppleStyle] = useState<number | null>(null);
  const buttonWidth = Math.max(240, width - 40);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    import('expo-apple-authentication')
      .then((mod) => {
        if (cancelled) return;
        setAppleButton(() => mod.AppleAuthenticationButton);
        setAppleType(mod.AppleAuthenticationButtonType.SIGN_IN);
        setAppleStyle(
          scheme === 'dark' ? mod.AppleAuthenticationButtonStyle.WHITE : mod.AppleAuthenticationButtonStyle.BLACK,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  if (Platform.OS !== 'ios') return null;

  async function finish(result: SocialResult, missingKey: TranslationKey) {
    if (result.ok || result.reason === 'cancelled') {
      onError(null);
      return;
    }
    if (result.reason === 'missing') {
      onError(missingKey);
      return;
    }
    onError(RESULT_KEY[result.reason]);
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[Type.footnote, styles.or, { color: c.ink3 }]}>{t('login.or')}</Text>
      {AppleButton && appleType != null && appleStyle != null ? (
        <AppleButton
          buttonType={appleType}
          buttonStyle={appleStyle}
          cornerRadius={27}
          style={{ width: buttonWidth, height: 54 }}
          onPress={() => {
            onError(null);
            signInWithApple().then((result) => finish(result, 'login.socialUnavailable'));
          }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => signInWithApple().then((result) => finish(result, 'login.socialUnavailable'))}
          style={[styles.fallback, { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' }]}>
          <Text style={[styles.fallbackLabel, { color: scheme === 'dark' ? '#000000' : '#ffffff' }]}>{t('login.apple')}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onError(null);
          signInWithGoogle().then((result) => finish(result, 'login.socialMissing'));
        }}
        style={[styles.fallback, { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1.5 }]}>
        <Text style={[styles.fallbackLabel, { color: c.ink }]}>{t('login.google')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  or: { textAlign: 'center' },
  fallback: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  fallbackLabel: { fontFamily: Fonts.semibold, fontSize: 17 },
});
