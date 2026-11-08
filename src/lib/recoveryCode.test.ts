import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isNetworkFailure,
  isRequestRateLimit,
  isSilentResetSendFailure,
  mapRecoveryCodeError,
  normalizeRecoveryCode,
  recoveryCodeReady,
  resendCooldownRemaining,
  RESEND_COOLDOWN_SEC,
} from './recoveryCode.ts';

test('a recovery code is 6 digits', () => {
  assert.equal(normalizeRecoveryCode('12 34-56'), '123456');
  assert.equal(normalizeRecoveryCode('abc1234567'), '123456');
  assert.equal(normalizeRecoveryCode('1234567890123'), '123456');
  assert.equal(recoveryCodeReady('12345'), false);
  assert.equal(recoveryCodeReady('123456'), true);
  assert.equal(recoveryCodeReady('1234567890'), true);
  assert.equal(recoveryCodeReady('12 34 56'), true);
  assert.equal(recoveryCodeReady(''), false);
  assert.equal(recoveryCodeReady('abcdef'), false);
  assert.equal(recoveryCodeReady('hash-fixture'), false);
});

test('resend waits 60 seconds from the send', () => {
  const sent = 1_700_000_000_000;
  assert.equal(RESEND_COOLDOWN_SEC, 60);
  assert.equal(resendCooldownRemaining(sent, sent), 60);
  assert.equal(resendCooldownRemaining(sent, sent + 59_000), 1);
  assert.equal(resendCooldownRemaining(sent, sent + 60_000), 0);
  assert.equal(resendCooldownRemaining(sent, sent + 90_000), 0);
  assert.equal(resendCooldownRemaining(sent, sent - 5_000), 60);
});

test('a wrong or expired recovery code is told apart from a rate limit and a network failure', () => {
  assert.equal(
    mapRecoveryCodeError({ code: 'otp_expired', message: 'Token has expired or is invalid' }),
    'codeRejected',
  );
  assert.equal(
    mapRecoveryCodeError({ code: 'otp_expired', message: 'Email link is invalid or has expired' }),
    'codeRejected',
  );
  assert.equal(mapRecoveryCodeError({ code: 'otp_expired', message: 'Token has expired' }), 'expired');
  assert.equal(mapRecoveryCodeError({ message: 'Invalid token' }), 'wrongCode');
  assert.equal(mapRecoveryCodeError({ code: 'otp_expired' }), 'codeRejected');
  assert.equal(
    mapRecoveryCodeError({ status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' }),
    'rate',
  );
  assert.equal(mapRecoveryCodeError({ message: 'Too many requests', status: 429 }), 'rate');
  assert.equal(
    mapRecoveryCodeError({ name: 'AuthRetryableFetchError', message: 'Network request failed', status: 0 }),
    'network',
  );
  assert.equal(mapRecoveryCodeError({ message: 'Failed to fetch', status: 0 }), 'network');
  assert.equal(mapRecoveryCodeError({ message: 'something else' }), 'generic');
});

test('an email-send limit is not shown as a different result from success', () => {
  const limited = {
    code: 'over_email_send_rate_limit',
    status: 429,
    message: 'For security purposes, you can only request this after 60 seconds.',
  };
  assert.equal(isSilentResetSendFailure(limited), true);
  assert.equal(isRequestRateLimit(limited), false);
  assert.equal(isNetworkFailure(limited), false);
  assert.equal(isRequestRateLimit({ status: 429, message: 'Request rate limit reached' }), true);
});
