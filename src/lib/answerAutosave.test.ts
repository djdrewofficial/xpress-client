import assert from 'node:assert/strict';
import test from 'node:test';

import { ANSWER_SAVE_MS, answerSaveVisible, inlineQuestionIds } from './answerAutosave.ts';

test('text answer autosave is debounced', () => {
  assert.equal(ANSWER_SAVE_MS, 700);
  assert.ok(ANSWER_SAVE_MS >= 400);
});

test('saved indicator stays quiet while idle', () => {
  assert.equal(answerSaveVisible('idle'), false);
  assert.equal(answerSaveVisible('saving'), true);
  assert.equal(answerSaveVisible('saved'), true);
  assert.equal(answerSaveVisible('failed'), true);
});

test('every visible question stays inline — no single-active fold', () => {
  assert.deepEqual(inlineQuestionIds(['q1', 'q2', 'q3']), ['q1', 'q2', 'q3']);
  assert.deepEqual(inlineQuestionIds([]), []);
});
