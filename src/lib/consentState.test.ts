import assert from 'node:assert/strict';
import test from 'node:test';

import {
  consentAfterReconcile,
  consentAfterWrite,
  consentFromRead,
  loadingConsent,
  type ConsentRead,
  type ConsentUi,
} from './consentState.ts';

const savedOn: ConsentRead = {
  ok: true,
  record: { granted: true, canGrant: false, canWithdraw: true, reason: null },
};

const savedOff: ConsentRead = {
  ok: true,
  record: { granted: false, canGrant: true, canWithdraw: false, reason: null },
};

const knownOn: ConsentUi = {
  phase: 'known',
  granted: true,
  canGrant: false,
  canWithdraw: true,
  notice: null,
};

const knownOff: ConsentUi = {
  phase: 'known',
  granted: false,
  canGrant: true,
  canWithdraw: false,
  notice: null,
};

test('loading does not claim a yes or a no', () => {
  const ui = loadingConsent();
  assert.equal(ui.phase, 'loading');
  assert.equal(ui.granted, null);
});

test('a failed read is unknown, not an explicit decline', () => {
  const ui = consentFromRead({ ok: false, status: 0, ineligible: false }, 'sms');
  assert.equal(ui.phase, 'unknown');
  assert.equal(ui.granted, null);
  assert.equal(ui.notice, 'unread');
});

test('a server record of not granted is a known no', () => {
  const ui = consentFromRead(savedOff, 'sms');
  assert.equal(ui.phase, 'known');
  assert.equal(ui.granted, false);
});

test('a lost grant response is unconfirmed and must be read back', () => {
  const decided = consentAfterWrite(knownOff, { ok: false, status: 0, ineligible: false }, 'sms', 'grant');
  assert.equal(decided.reconcile, true);
  assert.equal(decided.ui.phase, 'unknown');
  assert.equal(decided.ui.granted, null);
  assert.equal(decided.ui.notice, 'unconfirmed');
});

test('a lost withdrawal response is unconfirmed and is not shown as off', () => {
  const decided = consentAfterWrite(knownOn, { ok: false, status: 0, ineligible: false }, 'ai', 'withdraw');
  assert.equal(decided.reconcile, true);
  assert.equal(decided.ui.granted, null);
  assert.notEqual(decided.ui.granted, false);
});

test('reconciliation adopts a grant the lost response had already saved', () => {
  const ui = consentAfterReconcile(savedOn, 'sms');
  assert.equal(ui.phase, 'known');
  assert.equal(ui.granted, true);
});

test('reconciliation adopts a withdrawal the lost response had already saved', () => {
  const ui = consentAfterReconcile(savedOff, 'ai');
  assert.equal(ui.phase, 'known');
  assert.equal(ui.granted, false);
});

test('a failed read after a lost write stays unknown', () => {
  const ui = consentAfterReconcile({ ok: false, status: 0, ineligible: false }, 'sms');
  assert.equal(ui.phase, 'unknown');
  assert.equal(ui.granted, null);
  assert.equal(ui.notice, 'unconfirmed');
});

test('a definite server refusal keeps the last known switch', () => {
  const decided = consentAfterWrite(knownOn, { ok: false, status: 503, ineligible: false }, 'sms', 'withdraw');
  assert.equal(decided.reconcile, false);
  assert.equal(decided.ui.phase, 'known');
  assert.equal(decided.ui.granted, true);
  assert.equal(decided.ui.notice, 'unavailable');
});
