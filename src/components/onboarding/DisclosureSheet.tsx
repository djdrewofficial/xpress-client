import { ScrollView, Text, useWindowDimensions } from 'react-native';

import { Sheet, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Type } from '@/lib/theme';

/** Bottom sheet for the full consent wording. The paragraphs are passed in unchanged. */
export function DisclosureSheet({
  visible,
  title,
  paragraphs,
  onClose,
  onTerms,
  onPrivacy,
}: {
  visible: boolean;
  title: string;
  paragraphs: string[];
  onClose: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const body = { ...Type.footnote, color: c.ink2 };
  const link = { ...Type.footnote, color: c.accent, textDecorationLine: 'underline' as const };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.62) }}
        contentContainerStyle={{ paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled">
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={[body, index > 0 ? { marginTop: 12 } : null]}>
            {paragraph}
          </Text>
        ))}
        <Text accessibilityRole="link" onPress={onTerms} style={[link, { marginTop: 12 }]}>
          {t('legal.termsTitle')}
        </Text>
        <Text accessibilityRole="link" onPress={onPrivacy} style={[link, { marginTop: 8 }]}>
          {t('legal.privacyTitle')}
        </Text>
      </ScrollView>
    </Sheet>
  );
}
