/**
 * Welcome copy. Event-neutral: weddings and other celebrations share it.
 *
 * The full promotional-text disclosure is `smsDisclosureKeys`, shown from
 * Details before the switch is used. Welcome does not ask for AI permission
 * and does not treat Continue as AI consent.
 */

const welcomeEn = {
  'welcome.invite': 'Your songs and the plans for your celebration start here.',
  'welcome.dayToGo': 'day to go',
  'welcome.daysToGo': 'days to go',
  'welcome.today': 'today',
  'welcome.past': 'the celebration',
  'welcome.language': 'Language',
  'welcome.smsTitle': 'Promotional texts',
  'welcome.smsLine': 'Texts about flash sales, discounts and Epic Extras.',
  'welcome.details': 'Details',
  'welcome.agreeBefore': 'By continuing you agree to our ',
  'welcome.agreeAnd': ' and ',
  'welcome.agreeAfter': " and confirm you're 18+.",
} as const;

const welcomeEs: Record<keyof typeof welcomeEn, string> = {
  'welcome.invite': 'Tus canciones y los planes de tu celebración empiezan aquí.',
  'welcome.dayToGo': 'día para celebrar',
  'welcome.daysToGo': 'días para celebrar',
  'welcome.today': 'hoy',
  'welcome.past': 'la celebración',
  'welcome.language': 'Idioma',
  'welcome.smsTitle': 'Mensajes promocionales',
  'welcome.smsLine': 'Mensajes sobre ventas relámpago, descuentos y Epic Extras.',
  'welcome.details': 'Detalles',
  'welcome.agreeBefore': 'Al continuar aceptas las ',
  'welcome.agreeAnd': ' y la ',
  'welcome.agreeAfter': ', y confirmas que tienes 18 años o más.',
};

export const welcomeCopy = { en: welcomeEn, es: welcomeEs };

/** Existing promotional-text disclosure, in the order it appeared on the card. */
export const smsDisclosureKeys = ['sms.body', 'sms.disclosure', 'sms.reassurance'] as const;

/** One sentence around the existing Terms and Privacy titles. */
export function continueAgreement(locale: 'en' | 'es', termsTitle: string, privacyTitle: string): string {
  const copy = welcomeCopy[locale];
  return `${copy['welcome.agreeBefore']}${termsTitle}${copy['welcome.agreeAnd']}${privacyTitle}${copy['welcome.agreeAfter']}`;
}

/** Preview-only type scale. Production text follows the system size. */
export function scaledType<T extends { fontSize: number; lineHeight: number }>(style: T, scale: number): T {
  if (!Number.isFinite(scale) || scale === 1) return style;
  return {
    ...style,
    fontSize: Math.round(style.fontSize * scale),
    lineHeight: Math.round(style.lineHeight * scale),
  };
}
