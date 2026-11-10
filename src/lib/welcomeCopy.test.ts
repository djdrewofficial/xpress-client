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
  assert.equal(Object.keys(appEn).some((key) => key.startsWith('ai.')), false);
  assert.equal(Object.keys(appEs).some((key) => key.startsWith('ai.')), false);
});

test('My Event Safety is report/block only; Music owns song ideas and avoid notes', () => {
  assert.equal(appEn['safety.intro'], 'Report or block people and content on this event.');
  assert.equal(appEs['safety.intro'], 'Reporte o bloquee personas y contenido de este evento.');
  assert.equal(appEn['safety.reportRow'], 'Report a person or content');
  assert.equal(appEs['safety.reportRow'], 'Reportar a una persona o contenido');
  assert.equal(appEn['safety.songIdeas'], 'Song ideas');
  assert.equal(appEn['safety.avoid'], 'Music to avoid');
  assert.equal(appEs['safety.songIdeas'], 'Ideas de canciones');
  assert.equal(appEs['safety.avoid'], 'Música a evitar');
  assert.equal(
    appEn['safety.swipeHint'],
    'Swipe left to remove, right to add to Must Play, then tap to confirm.',
  );
  assert.equal(
    appEs['safety.swipeHint'],
    'Desliza a la izquierda para quitar y a la derecha para agregar a Imprescindibles; luego toca para confirmar.',
  );
  assert.equal(appEn['safety.tapToRemove'], 'Tap to remove');
  assert.equal(appEs['safety.tapToRemove'], 'Toca para quitar');
  assert.equal(appEn['safety.tapToMustPlay'], 'Tap to add to Must Play');
  assert.equal(appEs['safety.tapToMustPlay'], 'Toca para agregar a Imprescindibles');
  assert.match(appEn['safety.addedMustPlay'], /Must Play/);
  assert.match(appEs['safety.addedMustPlay'], /Imprescindibles/);
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
