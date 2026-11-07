import assert from 'node:assert/strict';
import test from 'node:test';

import { coverFromFeed, coverOnScope, noteSeedFromFeed, visibleCoverUrl, type CoverView } from './moderatedDisplay.ts';

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

const eventA = 'event-a';
const eventB = 'event-b';
const shown: CoverView = {
  eventId: eventA,
  url: 'https://example.test/a.jpg',
  author: { userId: 'person-a', label: 'Alex' },
};

test('switching events clears the previous cover before the next read returns', () => {
  const next = coverOnScope(shown, eventB);
  assert.equal(next.eventId, eventB);
  assert.equal(next.url, null);
  assert.equal(next.author, null);
});

test('a late response from the previous event does not restore its cover', () => {
  const cleared = coverOnScope(shown, eventB);
  const late = coverFromFeed(
    cleared,
    { eventId: eventA, active: false },
    { ok: true, url: shown.url, hidden: false, updatedBy: 'person-a', updatedByLabel: 'Alex' },
  );
  assert.equal(late.url, null);
  assert.equal(late.eventId, eventB);
});

test('focus or pull to refresh replaces a blocked cover on the same event', () => {
  const same = coverOnScope(shown, eventA);
  assert.equal(same.url, shown.url);
  const afterBlock = coverFromFeed(
    same,
    { eventId: eventA, active: true },
    { ok: true, url: shown.url, hidden: true, updatedBy: 'person-a', updatedByLabel: 'Alex' },
  );
  assert.equal(afterBlock.url, null);
  assert.equal(afterBlock.author, null);
});

test('a failed refresh does not keep a cover the feed could not confirm', () => {
  const after = coverFromFeed(shown, { eventId: eventA, active: true }, { ok: false });
  assert.equal(after.url, null);
});
