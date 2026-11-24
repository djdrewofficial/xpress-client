import assert from 'node:assert/strict';
import test from 'node:test';

import { REPORT_CONCERNS, targetForConcern } from './reportConcerns.ts';

test('event-level report concerns cover answers notes songs person cover and other', () => {
  assert.deepEqual([...REPORT_CONCERNS], ['answers', 'notes', 'songs', 'person', 'cover', 'other']);
});

test('answers and other map to the answer target the old Report answer link used', () => {
  assert.equal(targetForConcern('answers').targetType, 'answer');
  assert.equal(targetForConcern('other').targetType, 'answer');
  assert.equal(targetForConcern('notes').targetType, 'section_note');
  assert.equal(targetForConcern('songs').targetType, 'song');
});

test('person and cover attach optional ids when provided', () => {
  assert.deepEqual(targetForConcern('person', { personId: 'u1' }), {
    targetType: 'user',
    targetUserId: 'u1',
  });
  assert.deepEqual(targetForConcern('cover', { eventId: 'e1' }), {
    targetType: 'cover_photo',
    targetId: 'e1',
  });
});
