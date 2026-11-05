/**
 * Legal destinations for the welcome fine print.
 * Both are placeholders Drew can replace in this one file.
 * My Event still links at the live privacy URL separately.
 */
export const LEGAL_URLS = {
  terms: 'https://xpressdjs.com/terms',
  privacy: 'https://xpressdjs.com/privacy',
} as const;

export type LegalDoc = keyof typeof LEGAL_URLS;
