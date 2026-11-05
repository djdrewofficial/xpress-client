import { Text } from 'react-native';

import { Type } from '@/lib/theme';
import { useC } from './useC';

/**
 * "By continuing…" footnote. No checkbox — tapping Continue is the acceptance.
 * Terms and Privacy Policy (EN) / Términos and Política de privacidad (ES) are tappable.
 * The rest of the sentence is ink2 footnote.
 */
export function LegalLine({
  language = 'en',
  onTerms,
  onPrivacy,
}: {
  language?: 'en' | 'es';
  onTerms: () => void;
  onPrivacy: () => void;
}) {
  const c = useC();
  const link = [Type.footnote, { color: c.accent, textDecorationLine: 'underline' as const }];
  const base = [Type.footnote, { color: c.ink2, textAlign: 'center' as const }];

  if (language === 'es') {
    return (
      <Text style={base}>
        Al continuar, confirmas que tienes 18+ y aceptas nuestros <Text style={link} onPress={onTerms}>Términos</Text> y la{' '}
        <Text style={link} onPress={onPrivacy}>Política de privacidad</Text>, y recibir códigos de acceso y actualizaciones del evento por texto. Pueden aplicar cargos por mensajes y datos. Responde STOP para cancelar.
      </Text>
    );
  }

  return (
    <Text style={base}>
      By continuing, you confirm you&apos;re 18+ and agree to our <Text style={link} onPress={onTerms}>Terms</Text> and{' '}
      <Text style={link} onPress={onPrivacy}>Privacy Policy</Text>, and to get login codes and event updates by text. Msg &amp; data rates may apply. Reply STOP to opt out.
    </Text>
  );
}
