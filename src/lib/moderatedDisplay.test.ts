import assert from 'node:assert/strict';
import test from 'node:test';

import { noteSeedFromFeed, visibleCoverUrl } from './moderatedDisplay.ts';

const hiddenRaw = 'This note was hidden and must not appear';

test('initial load shows the moderated note text', () => {
  const seed = noteSeedFromFeed({ ok: true, note: { notes: 'Meet at the lounge', hidden: false } });
  assert.equal(seed.skipLoad, true);
  assert.equal(seed.text, 'Meet at the lounge');
});

test('a hidden note with no visible text renders empty', () => {
  const seed = noteSeedFromFeed({ ok: true, note: { notes: null, hidden: true } });
  assert.equal(seed.skipLoad, true);
  assert.equal(seed.text, '');
  assert.notEqual(seed.text, hiddenRaw);
});

test('staff still see a hidden note when the feed includes its text', () => {
  const seed = noteSeedFromFeed({ ok: true, note: { notes: 'Staff can review this', hidden: true } });
  assert.equal(seed.text, 'Staff can review this');
});

test('a blocked or omitted note renders empty', () => {
  const seed = noteSeedFromFeed({ ok: true, note: null });
  assert.equal(seed.skipLoad, true);
  assert.equal(seed.text, '');
});

test('hiding or blocking replaces the note that was already on screen', () => {
  const shown = noteSeedFromFeed({ ok: true, note: { notes: 'Visible first', hidden: false } });
  const afterHide = noteSeedFromFeed({ ok: true, note: null });
  assert.equal(shown.text, 'Visible first');
  assert.equal(afterHide.skipLoad, true);
  assert.equal(afterHide.text, '');
});

test('an unavailable feed does not supply note text', () => {
  const seed = noteSeedFromFeed({ ok: false });
  assert.equal(seed.skipLoad, false);
  assert.equal(seed.text, null);
  assert.notEqual(seed.text, hiddenRaw);
});

test('a hidden cover is not shown and a failed feed does not fall back', () => {
  assert.equal(visibleCoverUrl({ ok: true, url: 'https://example.test/cover.jpg', hidden: false }), 'https://example.test/cover.jpg');
  assert.equal(visibleCoverUrl({ ok: true, url: 'https://example.test/cover.jpg', hidden: true }), null);
  assert.equal(visibleCoverUrl({ ok: false }), null);
});
