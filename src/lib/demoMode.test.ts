import assert from 'node:assert/strict';
import test from 'node:test';

import { appEn, appEs } from './appCopy.ts';
import { readDemoModeFlag } from './demoMode.ts';

test('demo banner copy matches the approved EN line and a natural ES equivalent', () => {
  assert.equal(
    appEn['demo.body'],
    "You're exploring with sample info. Once your agreement is signed, this switches to your real plan.",
  );
  assert.equal(
    appEs['demo.body'],
    'Estás explorando con información de ejemplo. Cuando firmes el acuerdo, esto cambia a tu plan real.',
  );
  assert.equal(appEn['demo.badge'], 'Demo');
  assert.equal(appEs['demo.badge'], 'Demo');
  assert.equal(Object.keys(appEn).includes('demo.body'), true);
  assert.equal(Object.keys(appEs).includes('demo.body'), true);
});

test('readDemoModeFlag accepts camelCase demoMode from the mobile event card', () => {
  assert.equal(readDemoModeFlag({ demoMode: true }), true);
  assert.equal(readDemoModeFlag({ demoMode: false }), false);
  assert.equal(readDemoModeFlag({ demoMode: null }), false);
  assert.equal(readDemoModeFlag({}), false);
  assert.equal(readDemoModeFlag(null), false);
});

test('readDemoModeFlag also accepts snake_case demo_mode from guest card / views', () => {
  assert.equal(readDemoModeFlag({ demo_mode: true }), true);
  assert.equal(readDemoModeFlag({ demo_mode: false }), false);
  assert.equal(readDemoModeFlag({ demo_mode: true, demoMode: false }), true);
});
