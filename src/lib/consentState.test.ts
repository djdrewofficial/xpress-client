import assert from 'node:assert/strict';
import test from 'node:test';

import {
  consentAfterReconcile,
  consentAfterWrite,
  consentFromRead,
  loadingConsent,
  previewSmsChoice,
  settleConsentWrite,
  smsLockedNotice,
  smsSwitchEnabled,
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

test('a booking without a US mobile does not offer a switch', () => {
  const ui = consentFromRead(
    { ok: true, record: { granted: false, canGrant: false, canWithdraw: false, reason: 'no_mobile_number' } },
    'sms',
  );
  assert.equal(ui.notice, 'needPhone');
  assert.equal(smsSwitchEnabled(ui), false);
  assert.equal(smsLockedNotice(ui), 'needPhone');
});

test('an eligible promotional-text switch follows the choice', () => {
  const off = consentFromRead(
    { ok: true, record: { granted: false, canGrant: true, canWithdraw: false, reason: null } },
    'sms',
  );
  assert.equal(smsSwitchEnabled(off), true);
  assert.equal(smsLockedNotice(off), null);
  const on = previewSmsChoice('grant');
  assert.equal(on.granted, true);
  assert.equal(smsSwitchEnabled(on), true);
  const back = previewSmsChoice('withdraw');
  assert.equal(back.granted, false);
  assert.equal(smsSwitchEnabled(back), true);
});

test('a locked switch without a reason still explains itself', () => {
  const ui = consentFromRead(
    { ok: true, record: { granted: false, canGrant: false, canWithdraw: false, reason: null } },
    'sms',
  );
  assert.equal(smsSwitchEnabled(ui), false);
  assert.equal(smsLockedNotice(ui), 'ineligible');
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

test('a 500 after grant is unconfirmed for AI and for texts', async () => {
  for (const kind of ['ai', 'sms'] as const) {
    const decided = consentAfterWrite(knownOff, { ok: false, status: 500, ineligible: false }, kind, 'grant');
    assert.equal(decided.reconcile, true);
    assert.equal(decided.ui.granted, null);
    assert.equal(decided.ui.notice, 'unconfirmed');
    const settled = await settleConsentWrite({
      previous: knownOff,
      kind,
      intent: 'grant',
      write: async () => ({ ok: false, status: 500, ineligible: false }),
      read: async () => savedOn,
      isCurrent: () => true,
    });
    assert.equal(settled?.granted, true);
  }
});

test('a 500 after withdrawal stays unknown when the follow-up read fails', async () => {
  for (const kind of ['ai', 'sms'] as const) {
    const decided = consentAfterWrite(knownOn, { ok: false, status: 500, ineligible: false }, kind, 'withdraw');
    assert.equal(decided.reconcile, true);
    assert.equal(decided.ui.granted, null);
    const settled = await settleConsentWrite({
      previous: knownOn,
      kind,
      intent: 'withdraw',
      write: async () => ({ ok: false, status: 500, ineligible: false }),
      read: async () => ({ ok: false, status: 503, ineligible: false }),
      isCurrent: () => true,
    });
    assert.equal(settled?.phase, 'unknown');
    assert.equal(settled?.granted, null);
    assert.notEqual(settled?.granted, true);
  }
});

test('SMS 503 on grant is pre-write and stays the known off choice', () => {
  const decided = consentAfterWrite(knownOff, { ok: false, status: 503, ineligible: false }, 'sms', 'grant');
  assert.equal(decided.reconcile, false);
  assert.equal(decided.ui.phase, 'known');
  assert.equal(decided.ui.granted, false);
  assert.equal(decided.ui.notice, 'unavailable');
});

test('AI 503 after a grant is a committed save whose read failed', () => {
  const decided = consentAfterWrite(knownOff, { ok: false, status: 503, ineligible: false }, 'ai', 'grant');
  assert.equal(decided.reconcile, true);
  assert.equal(decided.ui.phase, 'unknown');
  assert.equal(decided.ui.granted, null);
  assert.notEqual(decided.ui.granted, false);
});

test('AI 503 after a withdrawal is a committed save whose read failed', () => {
  const decided = consentAfterWrite(knownOn, { ok: false, status: 503, ineligible: false }, 'ai', 'withdraw');
  assert.equal(decided.reconcile, true);
  assert.equal(decided.ui.phase, 'unknown');
  assert.equal(decided.ui.granted, null);
  assert.notEqual(decided.ui.granted, true);
});

test('validation and authorization failures do not read again', async () => {
  let reads = 0;
  const denied = await settleConsentWrite({
    previous: knownOff,
    kind: 'ai',
    intent: 'grant',
    write: async () => ({ ok: false, status: 400, ineligible: false }),
    read: async () => { reads += 1; return savedOn; },
    isCurrent: () => true,
  });
  assert.equal(reads, 0);
  assert.equal(denied?.phase, 'known');
  assert.equal(denied?.granted, false);
  assert.equal(denied?.notice, 'unavailable');

  const forbidden = await settleConsentWrite({
    previous: knownOn,
    kind: 'sms',
    intent: 'withdraw',
    write: async () => ({ ok: false, status: 403, ineligible: true }),
    read: async () => { reads += 1; return savedOff; },
    isCurrent: () => true,
  });
  assert.equal(reads, 0);
  assert.equal(forbidden?.granted, true);
  assert.equal(forbidden?.notice, 'ineligible');
});

test('a stale write does not apply and does not read after a newer request', async () => {
  let reads = 0;
  const settled = await settleConsentWrite({
    previous: knownOff,
    kind: 'ai',
    intent: 'grant',
    write: async () => ({ ok: false, status: 500, ineligible: false }),
    read: async () => { reads += 1; return savedOn; },
    isCurrent: () => false,
  });
  assert.equal(settled, null);
  assert.equal(reads, 0);
});

test('an unmount during the follow-up read drops the result', async () => {
  let current = true;
  const settled = await settleConsentWrite({
    previous: knownOn,
    kind: 'sms',
    intent: 'withdraw',
    write: async () => ({ ok: false, status: 0, ineligible: false }),
    read: async () => { current = false; return savedOff; },
    isCurrent: () => current,
  });
  assert.equal(settled, null);
});

test('a later unavailable read does not restore the stale switch', () => {
  const afterGrant = consentAfterWrite(knownOff, { ok: false, status: 503, ineligible: false }, 'ai', 'grant');
  const reread = consentAfterReconcile({ ok: false, status: 503, ineligible: false }, 'ai');
  assert.equal(afterGrant.reconcile, true);
  assert.equal(reread.phase, 'unknown');
  assert.equal(reread.granted, null);
  assert.equal(reread.notice, 'unconfirmed');

  const afterWithdraw = consentAfterWrite(knownOn, { ok: false, status: 503, ineligible: false }, 'ai', 'withdraw');
  const rereadWithdraw = consentAfterReconcile({ ok: false, status: 503, ineligible: false }, 'ai');
  assert.equal(afterWithdraw.reconcile, true);
  assert.equal(rereadWithdraw.granted, null);
  assert.notEqual(rereadWithdraw.granted, true);
});
