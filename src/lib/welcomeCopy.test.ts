import assert from 'node:assert/strict';
import test from 'node:test';

import { appEn, appEs } from './appCopy.ts';
import { legalDocument } from './legalCopy.ts';
import { continueAgreement, scaledType, smsDisclosureKeys, welcomeCopy } from './welcomeCopy.ts';

test('welcome copy has the same keys in English and Spanish, with no dashes', () => {
  assert.deepEqual(Object.keys(welcomeCopy.en).sort(), Object.keys(welcomeCopy.es).sort());
  for (const locale of ['en', 'es'] as const) {
    for (const value of Object.values(welcomeCopy[locale])) {
      assert.equal(value.includes('—'), false, value);
      assert.equal(value.includes('–'), false, value);
      assert.equal(value.includes('\n'), false, value);
      assert.ok(value.trim().length > 0);
    }
  }
});

test('continuing agrees to Terms, Privacy, and 18+ in one sentence', () => {
  assert.equal(
    continueAgreement('en', 'Terms of Use', 'Privacy Policy'),
    "By continuing you agree to our Terms of Use and Privacy Policy and confirm you're 18+.",
  );
  assert.equal(
    continueAgreement('es', 'Condiciones de uso', 'Política de privacidad'),
    'Al continuar aceptas las Condiciones de uso y la Política de privacidad, y confirmas que tienes 18 años o más.',
  );
  const english = continueAgreement('en', 'Terms of Use', 'Privacy Policy');
  assert.equal(english.includes('marketing'), false);
  assert.equal(english.includes('third-party'), false);
});

test('welcome does not ask for AI permission', () => {
  for (const locale of ['en', 'es'] as const) {
    for (const value of Object.values(welcomeCopy[locale])) {
      assert.equal(/openai|ai planning|herramientas de ia/i.test(value), false, value);
    }
  }
  assert.match(appEn['ai.body'], /OpenAI/);
  assert.match(appEs['ai.body'], /OpenAI/);
});

test('type scale leaves production sizes alone and grows a preview', () => {
  const base = { fontSize: 16, lineHeight: 24, fontFamily: 'Montserrat' };
  assert.deepEqual(scaledType(base, 1), base);
  assert.deepEqual(scaledType(base, 1.35), { fontSize: 22, lineHeight: 32, fontFamily: 'Montserrat' });
});

test('the locked promotional-text note is one short line', () => {
  assert.equal(appEn['sms.needPhone'], 'Add a mobile number to your booking to get texts.');
  assert.equal(appEs['sms.needPhone'], 'Agrega un número móvil a tu reserva para recibir textos.');
  assert.equal(appEn['sms.needPhone'].includes('\n'), false);
  assert.equal(appEs['sms.needPhone'].includes('\n'), false);
  assert.ok(appEn['sms.needPhone'].length < 70);
  assert.ok(appEs['sms.needPhone'].length < 70);
});

test('details keep the existing marketing disclosure for review before opt-in', () => {
  assert.deepEqual([...smsDisclosureKeys], ['sms.body', 'sms.disclosure', 'sms.reassurance']);

  const ai = appEn['ai.body'];
  assert.match(ai, /OpenAI/);
  assert.match(ai, /names, venue, timeline, music choices and planning answers/);
  assert.match(ai, /It's optional/);
  assert.match(ai, /turn it off anytime in My Event/);
  const aiEs = appEs['ai.body'];
  assert.match(aiEs, /OpenAI/);
  assert.match(aiEs, /Es opcional/);
  assert.match(aiEs, /Mi evento/);

  const sms = appEn['sms.disclosure'];
  assert.match(sms, /recurring automated marketing texts/);
  assert.match(sms, /US mobile number already on your booking/);
  assert.match(sms, /Consent is not required to book or use the app/);
  assert.match(sms, /Message frequency varies/);
  assert.match(sms, /Message and data rates may apply/);
  assert.match(sms, /Reply STOP to opt out or HELP for help/);
  assert.match(appEn['sms.reassurance'], /won't affect your service/);

  const smsEs = appEs['sms.disclosure'];
  assert.match(smsEs, /mensajes de texto automatizados y recurrentes/);
  assert.match(smsEs, /celular de EE\. UU\./);
  assert.match(smsEs, /no es necesario para reservar/);
  assert.match(smsEs, /STOP/);
  assert.match(smsEs, /HELP/);
  assert.match(appEs['sms.reassurance'], /no afecta su servicio/);
});

test('shared sections and public cover photos stay in Privacy and Terms', () => {
  const privacy = legalDocument('privacy', 'en').sections.map((section) => section.body).join('\n');
  const terms = legalDocument('terms', 'en').sections.map((section) => section.body).join('\n');
  assert.match(privacy, /shared section/i);
  assert.match(privacy, /Cover photos are stored in the public event-photos bucket/);
  assert.match(terms, /Shared sections are visible to other authorized participants and staff/);
  assert.match(terms, /Cover photos use public URLs/);

  const privacyEs = legalDocument('privacy', 'es').sections.map((section) => section.body).join('\n');
  const termsEs = legalDocument('terms', 'es').sections.map((section) => section.body).join('\n');
  assert.match(privacyEs, /sección compartida/);
  assert.match(privacyEs, /foto de portada/);
  assert.match(termsEs, /secciones compartidas/);
  assert.match(termsEs, /Las portadas utilizan URL públicas/);
});
