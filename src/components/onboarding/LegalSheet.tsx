import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { legalDocument, type LegalDoc } from '@/lib/legalCopy';
import { Type } from '@/lib/theme';

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
  const { t, locale } = useT();
  const insets = useSafeAreaInsets();
  const kind = doc ?? 'privacy';
  const document = legalDocument(kind, locale);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 }}>
          <Text style={[Type.largeTitle, { color: c.ink, fontSize: 28, lineHeight: 32, flex: 1 }]}>{document.title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Icon name="close" size={22} color={c.ink2} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 28 }}>
          {document.sections.map((section) => (
            <View key={section.heading} style={{ gap: 6 }}>
              <Text style={[Type.headline, { color: c.ink }]}>{section.heading}</Text>
              <Text style={[Type.body, { color: c.ink2 }]}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
