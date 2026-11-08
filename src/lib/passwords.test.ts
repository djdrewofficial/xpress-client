import assert from 'node:assert/strict';
import test from 'node:test';

import {
  passwordErrorAfterEdit,
  passwordFieldsIssue,
  passwordServerIssue,
  valuesForPasswordSubmit,
} from './passwords.ts';

const EMAIL = 'person@example.com';
const LONG = 'fixture-pass-1';
const LONG_MARK = 'fixture-pass-1!';

test('matching passwords longer than 8 characters are accepted', () => {
  assert.equal(LONG.length > 8, true);
  assert.equal(passwordFieldsIssue(LONG, LONG, EMAIL), null);
});

test('passwords longer than 8 that differ by trailing punctuation are a mismatch', () => {
  const issue = passwordFieldsIssue(LONG, LONG_MARK, EMAIL);
  assert.equal(issue?.issue, 'mismatch');
  assert.equal(issue?.field, 'confirm');
  assert.notEqual(issue?.issue, 'short');
});

test('a password under 8 characters is a length error on the password field', () => {
  const issue = passwordFieldsIssue('short1', 'short1', EMAIL);
  assert.equal('short1'.length < 8, true);
  assert.equal(issue?.issue, 'short');
  assert.equal(issue?.field, 'password');
});

test('the keyboard text is checked instead of the previous confirm value', () => {
  const stale = valuesForPasswordSubmit({ password: 'short1', confirm: 'short1' });
  assert.equal(passwordFieldsIssue(stale.password, stale.confirm, EMAIL)?.issue, 'short');
  const typed = valuesForPasswordSubmit({
    password: LONG,
    confirm: LONG,
    confirmFromKeyboard: LONG_MARK,
  });
  const issue = passwordFieldsIssue(typed.password, typed.confirm, EMAIL);
  assert.equal(issue?.issue, 'mismatch');
  assert.notEqual(issue?.issue, 'short');
});

test('a length warning does not stick after the text becomes a long mismatch or a valid match', () => {
  const short = passwordFieldsIssue('short1', 'short1', EMAIL);
  const differed = passwordErrorAfterEdit(short, LONG, LONG_MARK, EMAIL);
  assert.equal(differed?.issue, 'mismatch');
  assert.equal(differed?.field, 'confirm');
  assert.equal(passwordErrorAfterEdit(differed, LONG, LONG, EMAIL), null);
});

test('a weak server password is not reported as the 8-character rule', () => {
  assert.equal(passwordServerIssue('Password is known to be weak and easy to guess'), 'weak');
  assert.equal(passwordServerIssue('Password should be at least 8 characters'), 'short');
  assert.equal(passwordServerIssue('Invalid login credentials'), null);
});
