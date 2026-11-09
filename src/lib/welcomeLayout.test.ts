import assert from 'node:assert/strict';
import test from 'node:test';

import { appEn, appEs } from './appCopy.ts';
import { continueAgreement, welcomeCopy } from './welcomeCopy.ts';
import { WELCOME_BUTTON_HEIGHT, welcomePosterLayout, type WelcomeMeasureCopy } from './welcomeLayout.ts';

const IPHONE = {
  form: 'phone' as const,
  windowHeight: 874,
  contentWidth: 362,
  topInset: 59,
  bottomInset: 34,
};

function measure(locale: 'en' | 'es'): WelcomeMeasureCopy {
  const copy = welcomeCopy[locale];
  const terms = locale === 'es' ? 'Condiciones de uso' : 'Terms of Use';
  const privacy = locale === 'es' ? 'Política de privacidad' : 'Privacy Policy';
  return {
    invite: copy['welcome.invite'],
    daysToGo: copy['welcome.daysToGo'],
    smsLine: copy['welcome.smsLine'],
    phoneNote: locale === 'es' ? appEs['sms.needPhone'] : appEn['sms.needPhone'],
    agreement: continueAgreement(locale, terms, privacy),
  };
}

test('Continue stays a full pill', () => {
  assert.equal(WELCOME_BUTTON_HEIGHT, 54);
});

test('Spanish and English Welcome fit an iPhone at normal text size', () => {
  for (const locale of ['en', 'es'] as const) {
    const layout = welcomePosterLayout({ ...IPHONE, fontScale: 1, copy: measure(locale) });
    assert.equal(layout.scrolls, false, locale);
    assert.ok((layout.posterMinHeight ?? 0) >= 300, locale);
  }
});

test('larger text may scroll and does not shrink Continue', () => {
  const layout = welcomePosterLayout({ ...IPHONE, fontScale: 1.35, copy: measure('es') });
  assert.equal(layout.scrolls, true);
  assert.equal(WELCOME_BUTTON_HEIGHT, 54);
  assert.ok((layout.posterMinHeight ?? 0) > 0);
});

test('an iPad keeps its own poster', () => {
  const layout = welcomePosterLayout({
    form: 'tablet',
    windowHeight: 1194,
    contentWidth: 720,
    topInset: 24,
    bottomInset: 20,
    fontScale: 1,
    copy: measure('es'),
  });
  assert.equal(layout.posterMinHeight, null);
  assert.equal(layout.scrolls, false);
});

test('a small iPhone still keeps Continue on one screen at normal text', () => {
  for (const locale of ['en', 'es'] as const) {
    const layout = welcomePosterLayout({
      form: 'phone',
      windowHeight: 667,
      contentWidth: 335,
      topInset: 20,
      bottomInset: 0,
      fontScale: 1,
      copy: measure(locale),
    });
    assert.equal(layout.scrolls, false, locale);
  }
});
