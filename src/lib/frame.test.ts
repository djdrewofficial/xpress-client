import assert from 'node:assert/strict';
import test from 'node:test';

import { frameFor } from './frame.ts';

test('a small phone stays full width with two columns', () => {
  const frame = frameFor(320);
  assert.equal(frame.form, 'phone');
  assert.equal(frame.contentWidth, 320);
  assert.equal(frame.columns, 2);
  assert.equal(frame.sheetWidth, null);
});

test('a large phone is still a phone layout', () => {
  const frame = frameFor(430);
  assert.equal(frame.form, 'phone');
  assert.equal(frame.contentWidth, 430);
  assert.equal(frame.sheetWidth, null);
});

test('a narrow iPad split stays a phone layout', () => {
  const frame = frameFor(507);
  assert.equal(frame.form, 'phone');
  assert.equal(frame.columns, 2);
});

test('an iPad portrait centers a column and uses more grid columns', () => {
  const mini = frameFor(744);
  assert.equal(mini.form, 'tablet');
  assert.ok(mini.contentWidth <= 720);
  assert.ok(mini.contentWidth < mini.width);
  assert.equal(mini.columns, 3);
  assert.equal(mini.sheetWidth, 560);

  const eleven = frameFor(834);
  assert.equal(eleven.form, 'tablet');
  assert.equal(eleven.columns, 3);

  const thirteen = frameFor(1024);
  assert.equal(thirteen.form, 'tablet');
  assert.equal(thirteen.columns, 4);
  assert.equal(thirteen.contentWidth, 720);
  assert.equal(thirteen.sheetWidth, 560);
});
