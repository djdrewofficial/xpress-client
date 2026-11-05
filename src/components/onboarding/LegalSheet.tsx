import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Button, Icon, Sheet, useC } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { LEGAL_URLS, type LegalDoc } from '@/lib/legal';
import { Type } from '@/lib/theme';

const PRIVACY: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'legal.collectTitle', body: 'legal.collectBody' },
  { title: 'legal.useTitle', body: 'legal.useBody' },
  { title: 'legal.shareTitle', body: 'legal.shareBody' },
  { title: 'legal.choicesTitle', body: 'legal.choicesBody' },
];

const TERMS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'legal.termsServiceTitle', body: 'legal.termsServiceBody' },
  { title: 'legal.termsAccountTitle', body: 'legal.termsAccountBody' },
  { title: 'legal.termsSmsTitle', body: 'legal.termsSmsBody' },
];

export function LegalSheet({
  visible,
  doc,
  onClose,
}: {
  visible: boolean;
  doc: LegalDoc | null;
  onClose: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const kind = doc ?? 'privacy';
  const sections = kind === 'terms' ? TERMS : PRIVACY;
  const title = kind === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle');

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Text style={[Type.largeTitle, { color: c.ink, fontSize: 28, lineHeight: 32, flex: 1 }]}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={22} color={c.ink2} />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Text style={[Type.footnote, { color: c.red }]}>{t('legal.placeholder')}</Text>
        {sections.map((section) => (
          <View key={section.title} style={{ gap: 4 }}>
            <Text style={[Type.headline, { color: c.ink }]}>{t(section.title)}</Text>
            <Text style={[Type.body, { color: c.ink2 }]}>{t(section.body)}</Text>
          </View>
        ))}
        <Button label={t('legal.openWeb')} variant="ghost" onPress={() => Linking.openURL(LEGAL_URLS[kind])} />
      </ScrollView>
    </Sheet>
  );
}
