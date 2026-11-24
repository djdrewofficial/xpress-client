import { StyleSheet, Text, View } from 'react-native';

import { useScheme } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Space, Type } from '@/lib/theme';

/**
 * Slim Demo Mode notice for the main tabs.
 * Shown while `event.demoMode` is true; not a modal — layout only, taps still work on the tabs below.
 */
export function DemoModeBanner() {
  const scheme = useScheme();
  const { t } = useT();
  const light = scheme === 'light';

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        {
          backgroundColor: light ? '#ebe4f8' : Brand.purpleDeep,
          borderBottomColor: light ? Brand.purpleLight : Brand.purpleMid,
        },
      ]}>
      <View style={[styles.pill, { backgroundColor: Brand.purple }]}>
        <Text style={styles.pillText}>{t('demo.badge')}</Text>
      </View>
      <Text style={[styles.body, { color: light ? Brand.purpleDeep : Brand.white }]}>{t('demo.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 1,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.white,
  },
  body: {
    ...Type.footnote,
    flex: 1,
    fontFamily: Fonts.medium,
  },
});
