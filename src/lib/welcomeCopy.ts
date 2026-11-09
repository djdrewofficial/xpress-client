/**
 * Short Welcome copy.
 *
 * The paragraph that used to sit under the greeting is not shown here.
 * Its two practical points already live in the policies: shared sections are
 * visible to authorized participants and staff (Privacy section 5 and Terms),
 * and cover photos use public links (Privacy section 6 and Terms).
 *
 * Details sheets render `aiDisclosureKeys` and `smsDisclosureKeys` through
 * the existing dictionaries, word for word.
 */

const welcomeEn = {
  'welcome.aiTitle': 'AI planning tools',
  'welcome.aiLine': 'Let your DJ use AI tools to organize your plans.',
  'welcome.smsTitle': 'Promotional texts',
  'welcome.smsLine': 'Get texts about flash sales, discounts and Epic Extras.',
  'welcome.smsRates': 'Recurring automated texts. Msg & data rates may apply. Reply STOP to opt out.',
  'welcome.details': 'Details',
  'welcome.agreeBefore': 'By continuing you agree to our ',
  'welcome.agreeAnd': ' and ',
  'welcome.agreeAfter': " and confirm you're 18+.",
} as const;

const welcomeEs: Record<keyof typeof welcomeEn, string> = {
  'welcome.aiTitle': 'Planificación con IA',
  'welcome.aiLine': 'Deja que tu DJ use herramientas de IA para organizar tus planes.',
  'welcome.smsTitle': 'Mensajes promocionales',
  'welcome.smsLine': 'Recibe mensajes sobre ventas relámpago, descuentos y Epic Extras.',
  'welcome.smsRates': 'Mensajes automáticos recurrentes. Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar.',
  'welcome.details': 'Detalles',
  'welcome.agreeBefore': 'Al continuar aceptas las ',
  'welcome.agreeAnd': ' y la ',
  'welcome.agreeAfter': ', y confirmas que tienes 18 años o más.',
};

export const welcomeCopy = { en: welcomeEn, es: welcomeEs };

/** Existing AI disclosure. Do not rewrite these strings in the sheet. */
export const aiDisclosureKeys = ['ai.body'] as const;

/** Existing promotional-text disclosure, in the order it appeared on the card. */
export const smsDisclosureKeys = ['sms.body', 'sms.disclosure', 'sms.reassurance'] as const;

/** TCPA summary sits beside the switch only after promotional texts are on. */
export function marketingRatesVisible(granted: boolean | null): boolean {
  return granted === true;
}

/** One sentence around the existing Terms and Privacy titles. */
export function continueAgreement(locale: 'en' | 'es', termsTitle: string, privacyTitle: string): string {
  const copy = welcomeCopy[locale];
  return `${copy['welcome.agreeBefore']}${termsTitle}${copy['welcome.agreeAnd']}${privacyTitle}${copy['welcome.agreeAfter']}`;
}
