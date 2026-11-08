import assert from 'node:assert/strict';
import test from 'node:test';

import { newPasswordIssue } from './passwords.ts';
import {
  applyAuthLink,
  authAdoptInflight,
  classifyAuthUrl,
  finishAuthAdopt,
  isRecoverySessionFailure,
  recoveryRedirectUrl,
  recoveryTemplateHref,
  startAuthAdopt,
  type AuthExchange,
  type AuthLink,
} from './recoveryLink.ts';

const HTTPS_RESET = 'https://xos.xpressdjs.com/auth/reset';
const TRIPLE_SLASH = 'xpressclient:///auth/reset';

function session() {
  return { user: { id: 'fixture-user' } };
}

function client(partial: Partial<AuthExchange> = {}): AuthExchange & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    exchangeCodeForSession: async () => {
      calls.push('exchange');
      return { data: { session: session(), redirectType: 'recovery' }, error: null };
    },
    verifyOtp: async () => {
      calls.push('verify');
      return { data: { session: session() }, error: null };
    },
    getSession: async () => {
      calls.push('getSession');
      return { data: { session: null } };
    },
    setSession: async () => {
      calls.push('setSession');
      return { error: null };
    },
    ...partial,
    calls,
  };
}

test('recovery redirect is the allow-listed double-slash URL', () => {
  assert.equal(recoveryRedirectUrl(), 'xpressclient://auth/reset');
  assert.notEqual(recoveryRedirectUrl(), TRIPLE_SLASH);
  assert.notEqual(recoveryRedirectUrl(), HTTPS_RESET);
});

test('the saved template href on that redirect is a token-hash recovery', () => {
  const link = classifyAuthUrl(recoveryTemplateHref('hash-fixture'));
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.mode, 'otp');
  assert.equal(link.path, 'reset');
  assert.equal(link.tokenHash, 'hash-fixture');
  assert.equal(link.type, 'recovery');
  assert.equal(recoveryTemplateHref('hash-fixture'), 'xpressclient://auth/reset?token_hash=hash-fixture&type=recovery');
});

test('classifies a token hash recovery link on the associated host', () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?token_hash=hash-fixture&type=recovery`);
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.mode, 'otp');
  assert.equal(link.path, 'reset');
  assert.equal(link.tokenHash, 'hash-fixture');
  assert.equal(link.type, 'recovery');
});

test('classifies a PKCE code on the custom scheme without a type query', () => {
  const triple = classifyAuthUrl('xpressclient:///auth/reset?code=code-fixture');
  const host = classifyAuthUrl('xpressclient://auth/reset?code=code-fixture');
  for (const link of [triple, host]) {
    assert.equal(link.kind, 'credentials');
    if (link.kind !== 'credentials') continue;
    assert.equal(link.mode, 'code');
    assert.equal(link.path, 'reset');
    assert.equal(link.code, 'code-fixture');
    assert.equal(link.type, null);
  }
});

test('classifies an implicit recovery fragment', () => {
  const link = classifyAuthUrl(
    'xpressclient:///auth/reset#access_token=access-fixture&refresh_token=refresh-fixture&type=recovery',
  );
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.mode, 'implicit');
  assert.equal(link.type, 'recovery');
  assert.equal(link.accessToken, 'access-fixture');
  assert.equal(link.refreshToken, 'refresh-fixture');
});

test('expired and used links are failures, including plus-encoded descriptions', () => {
  assert.equal(
    classifyAuthUrl(`${HTTPS_RESET}?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`).kind,
    'failed',
  );
  assert.equal(classifyAuthUrl('xpressclient:///auth/reset?error_code=flow_state_expired').kind, 'failed');
  assert.equal(classifyAuthUrl(`${HTTPS_RESET}?error_code=flow_state_not_found`).kind, 'failed');
});

test('a reset path with no credentials is a failed link', () => {
  assert.equal(classifyAuthUrl(HTTPS_RESET).kind, 'failed');
  assert.equal(classifyAuthUrl('xpressclient://auth/reset').kind, 'failed');
});

test('the site-root fallback is not the reset route', () => {
  const link = classifyAuthUrl('https://xos.xpressdjs.com?token_hash=hash-fixture&type=recovery');
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.path, null);
  assert.equal(link.mode, 'otp');
  assert.equal(link.type, 'recovery');
});

test('the allow-listed set-password page is a recovery token hash', async () => {
  const link = classifyAuthUrl('https://xos.xpressdjs.com/auth/set-password?token_hash=hash-fixture&type=recovery');
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.path, 'set-password');
  assert.equal(link.type, 'recovery');
  assert.equal(await applyAuthLink(link, client()), 'recovery');
});

test('a triple-slash token hash is still a reset link if it arrives', () => {
  const link = classifyAuthUrl(`${TRIPLE_SLASH}?token_hash=hash-fixture&type=recovery`);
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.path, 'reset');
  assert.equal(link.mode, 'otp');
});

test('join links and other hosts are not auth callbacks', () => {
  assert.equal(classifyAuthUrl('https://xos.xpressdjs.com/j/join-fixture').kind, 'none');
  assert.equal(classifyAuthUrl('https://example.com/auth/reset?code=code-fixture').kind, 'none');
  assert.equal(classifyAuthUrl('xpressclient:///j/join-fixture').kind, 'none');
});

test('a confirmation code is not a password recovery', () => {
  const link = classifyAuthUrl('https://xos.xpressdjs.com/auth/confirm?code=code-fixture');
  assert.equal(link.kind, 'credentials');
  if (link.kind !== 'credentials') return;
  assert.equal(link.path, 'confirm');
  assert.equal(link.type, null);
});

test('PKCE redirectType recovery opens the new-password flow when the URL omits type', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?code=code-fixture`);
  const fake = client();
  assert.equal(await applyAuthLink(link, fake), 'recovery');
  assert.deepEqual(fake.calls, ['exchange']);
});

test('a stored signup redirect is a normal session even on the reset path', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?code=code-fixture`);
  const fake = client({
    exchangeCodeForSession: async () => ({ data: { session: session(), redirectType: 'signup' }, error: null }),
  });
  assert.equal(await applyAuthLink(link, fake), 'session');
});

test('a confirmation code exchange is a session, not a recovery', async () => {
  const link = classifyAuthUrl('https://xos.xpressdjs.com/auth/confirm?code=code-fixture&type=signup');
  const fake = client({
    exchangeCodeForSession: async () => ({ data: { session: session(), redirectType: null }, error: null }),
  });
  assert.equal(await applyAuthLink(link, fake), 'session');
});

test('a used or missing recovery code does not become a session', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?code=code-fixture`);
  const calls: string[] = [];
  const fake = client({
    exchangeCodeForSession: async () => {
      calls.push('exchange');
      return {
        data: { session: null, redirectType: null },
        error: { code: 'flow_state_expired', message: 'expired' },
      };
    },
  });
  assert.equal(await applyAuthLink(link, fake), 'expired');
  assert.deepEqual(calls, ['exchange']);
});

test('a failed confirmation code stays ignored', async () => {
  const link = classifyAuthUrl('https://xos.xpressdjs.com/auth/confirm?code=code-fixture');
  const fake = client({
    exchangeCodeForSession: async () => ({ data: { session: null, redirectType: null }, error: { message: 'bad' } }),
  });
  assert.equal(await applyAuthLink(link, fake), 'ignored');
});

test('token hash recovery verifies and a rejected hash stays expired', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?token_hash=hash-fixture&type=recovery`);
  const ok = client();
  assert.equal(await applyAuthLink(link, ok), 'recovery');
  assert.deepEqual(ok.calls, ['verify']);

  const rejected = client({
    verifyOtp: async () => ({ data: { session: null }, error: { code: 'otp_expired', message: 'expired' } }),
  });
  assert.equal(await applyAuthLink(link, rejected), 'expired');
});

test('a reset token hash without a type is still recovery', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?token_hash=hash-fixture`);
  assert.equal(link.kind, 'credentials');
  if (link.kind === 'credentials') assert.equal(link.type, 'recovery');
  const fake = client();
  assert.equal(await applyAuthLink(link, fake), 'recovery');
});

test('an expired query does not call the auth client', async () => {
  const link = classifyAuthUrl(`${HTTPS_RESET}?error_code=otp_expired`);
  const fake = client();
  assert.equal(await applyAuthLink(link, fake), 'expired');
  assert.deepEqual(fake.calls, []);
});

test('implicit recovery replaces the current session', async () => {
  const link = classifyAuthUrl(
    'xpressclient:///auth/reset#access_token=access-fixture&refresh_token=refresh-fixture&type=recovery',
  );
  const fake = client({
    getSession: async () => ({ data: { session: session() } }),
  });
  assert.equal(await applyAuthLink(link, fake), 'recovery');
  assert.deepEqual(fake.calls, ['setSession']);
});

test('a non-recovery implicit link does not replace a live session', async () => {
  const link: AuthLink = {
    kind: 'credentials',
    path: 'confirm',
    mode: 'implicit',
    code: null,
    tokenHash: null,
    accessToken: 'access-fixture',
    refreshToken: 'refresh-fixture',
    type: 'signup',
  };
  const calls: string[] = [];
  const fake = client({
    getSession: async () => {
      calls.push('getSession');
      return { data: { session: session() } };
    },
    setSession: async () => {
      calls.push('setSession');
      return { error: null };
    },
  });
  assert.equal(await applyAuthLink(link, fake), 'session');
  assert.deepEqual(calls, ['getSession']);
});

test('new password rules reject a mismatch, a short value, and a missing number', () => {
  assert.equal(newPasswordIssue('abcd1234', 'abcd1234', 'person@example.com'), null);
  assert.equal(newPasswordIssue('abcd1234', 'abcd1235', 'person@example.com'), 'mismatch');
  assert.equal(newPasswordIssue('short1', 'short1', 'person@example.com'), 'short');
  assert.equal(newPasswordIssue('abcdefgh', 'abcdefgh', 'person@example.com'), 'number');
  assert.equal(newPasswordIssue('12345678', '12345678', 'person@example.com'), 'letter');
  assert.equal(newPasswordIssue('user1@example.com', 'user1@example.com', 'user1@example.com'), 'email');
});

test('recovery session failures are distinguished from a wrong password', () => {
  assert.equal(isRecoverySessionFailure('otp_expired', 'Email link is invalid or has expired'), true);
  assert.equal(isRecoverySessionFailure('session_not_found', ''), true);
  assert.equal(isRecoverySessionFailure(undefined, 'Auth session missing!'), true);
  assert.equal(isRecoverySessionFailure('invalid_credentials', 'Invalid login credentials'), false);
});

test('adopt tracking covers the gap before a cold-start exchange finishes', () => {
  assert.equal(authAdoptInflight(), false);
  startAuthAdopt();
  assert.equal(authAdoptInflight(), true);
  finishAuthAdopt();
  assert.equal(authAdoptInflight(), false);
});
