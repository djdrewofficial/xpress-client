import { Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { Type } from '@/lib/theme';
import { scaledType } from '@/lib/welcomeCopy';
import { useC } from './useC';

/** Review prompt with tappable Privacy and Terms. Continuing does not authorize marketing texts. */
export function LegalLine({
  onTerms,
  onPrivacy,
}: {
  language?: 'en' | 'es';
  onTerms: () => void;
  onPrivacy: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const link = [Type.footnote, { color: c.accent, textDecorationLine: 'underline' as const }];
  const base = [Type.footnote, { color: c.ink2, textAlign: 'center' as const }];

  return (
    <Text style={base}>
      {t('legal.reviewBefore')}{' '}
      <Text style={link} onPress={onPrivacy}>{t('legal.privacyTitle')}</Text>
      {t('legal.reviewAnd')}
      <Text style={link} onPress={onTerms}>{t('legal.termsTitle')}</Text>
      {t('legal.reviewAfter')}
    </Text>
  );
}

/**
 * One sentence above Continue. Terms and Privacy are links.
 * Continuing still records the same acceptance. It does not opt in to promotional texts.
 */
export function ContinueAgreement({
  onTerms,
  onPrivacy,
  fontScale = 1,
}: {
  onTerms: () => void;
  onPrivacy: () => void;
  /** Sample preview only. Production stays on the system text size. */
  fontScale?: number;
}) {
  const c = useC();
  const { t } = useT();
  const foot = scaledType(Type.footnote, fontScale);
  const link = [foot, { color: c.accent, textDecorationLine: 'underline' as const }];
  const base = [foot, { color: c.ink2, textAlign: 'center' as const }];

  return (
    <Text style={base}>
      {t('welcome.agreeBefore')}
      <Text style={link} accessibilityRole="link" onPress={onTerms}>{t('legal.termsTitle')}</Text>
      {t('welcome.agreeAnd')}
      <Text style={link} accessibilityRole="link" onPress={onPrivacy}>{t('legal.privacyTitle')}</Text>
      {t('welcome.agreeAfter')}
    </Text>
  );
}

/** Plain AI notice. No toggle and no consent question. Opens Privacy when tapped. */
export function AiNotice({
  onPrivacy,
  fontScale = 1,
}: {
  onPrivacy: () => void;
  /** Sample preview only. Production stays on the system text size. */
  fontScale?: number;
}) {
  const c = useC();
  const { t } = useT();
  const foot = scaledType(Type.footnote, fontScale);
  return (
    <Text
      style={[foot, { color: c.ink3, textAlign: 'center', textDecorationLine: 'underline' }]}
      accessibilityRole="link"
      onPress={onPrivacy}
    >
      {t('welcome.aiNotice')}
    </Text>
  );
}

/** Privacy and Terms links for sign-in and sign-up. Does not open unpublished website pages. */
export function PolicyLinks({
  onPrivacy,
  onTerms,
  note = false,
}: {
  onPrivacy: () => void;
  onTerms: () => void;
  note?: boolean;
}) {
  const c = useC();
  const { t } = useT();
  const link = [Type.footnote, { color: c.accent, textDecorationLine: 'underline' as const }];
  return (
    <View style={{ gap: 8 }}>
      {note ? <Text style={[Type.footnote, { color: c.ink3, textAlign: 'center' }]}>{t('legal.signInNote')}</Text> : null}
      <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center' }]}>
        <Text style={link} onPress={onPrivacy}>{t('legal.privacyTitle')}</Text>
        {' · '}
        <Text style={link} onPress={onTerms}>{t('legal.termsTitle')}</Text>
      </Text>
    </View>
  );
}
