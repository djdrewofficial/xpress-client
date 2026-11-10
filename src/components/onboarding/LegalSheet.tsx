import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { legalDocument, type LegalBlock, type LegalDoc, type LegalListItem } from '@/lib/legalCopy';
import { Fonts, Type } from '@/lib/theme';

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
          {document.preamble?.length ? (
            <View style={{ gap: 4 }}>
              {document.preamble.map((line) => (
                <Text key={line} style={[Type.footnote, { color: c.ink3 }]}>{line}</Text>
              ))}
            </View>
          ) : null}
          {document.sections.map((section) => (
            <View key={section.heading} style={{ gap: 8 }}>
              <Text style={[Type.headline, { color: c.ink }]}>{section.heading}</Text>
              {section.body ? <Text style={[Type.body, { color: c.ink2 }]}>{section.body}</Text> : null}
              {section.blocks?.map((block, index) => (
                <LegalBlockView key={`${section.heading}-${index}`} block={block} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  const c = useC();
  if (block.type === 'p') {
    return (
      <Text style={[Type.body, { color: c.ink2 }]}>
        {block.lead ? <Text style={{ fontFamily: Fonts.semibold, color: c.ink }}>{block.lead}{' '}</Text> : null}
        {block.text}
      </Text>
    );
  }
  if (block.type === 'ul') {
    return (
      <View style={{ gap: 6 }}>
        {block.items.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: 8, paddingLeft: 2 }}>
            <Text style={[Type.body, { color: c.ink2, lineHeight: 24 }]}>{'\u2022'}</Text>
            <Text style={[Type.body, { color: c.ink2, flex: 1 }]}>
              <ListItemText item={item} />
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 8, gap: 12 }}>
        <Text style={[Type.subhead, { color: c.ink, flex: 1.2 }]}>{block.columns[0]}</Text>
        <Text style={[Type.subhead, { color: c.ink, flex: 1 }]}>{block.columns[1]}</Text>
      </View>
      {block.rows.map((row) => (
        <View
          key={`${row[0]}-${row[1]}`}
          style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderTopWidth: 1, borderTopColor: c.line }}
        >
          <Text style={[Type.footnote, { color: c.ink2, flex: 1.2 }]}>{row[0]}</Text>
          <Text style={[Type.footnote, { color: c.ink, flex: 1, fontFamily: Fonts.medium }]}>{row[1]}</Text>
        </View>
      ))}
    </View>
  );
}

function ListItemText({ item }: { item: LegalListItem }) {
  const c = useC();
  if (typeof item === 'string') return <>{item}</>;
  return (
    <>
      <Text style={{ fontFamily: Fonts.semibold, color: c.ink }}>{item.lead}{' '}</Text>
      {item.text}
    </>
  );
}
