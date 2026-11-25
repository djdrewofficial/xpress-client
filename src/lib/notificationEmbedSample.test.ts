import assert from 'node:assert/strict';
import test from 'node:test';

import { appEn, appEs } from './appCopy.ts';
import { sampleBookingBodyHtml, sampleBookingEmbedHtml } from './notificationEmbedSample.ts';

test('sample booking embed is self-contained HTML with a calendar card', () => {
  const html = sampleBookingEmbedHtml({ djName: 'DJ Alex' });
  assert.match(html, /Book with DJ Alex/);
  assert.match(html, /Planning meeting/);
  assert.match(html, /#4b328e/);
  assert.match(html, /#fe3a3b/);
  assert.match(html, /Thu 6:00 PM/);
  assert.equal(html.includes('http://'), false);
  assert.equal(html.includes('https://'), false);
});

test('sample booking body has no em dashes', () => {
  assert.equal(sampleBookingBodyHtml().includes('\u2014'), false);
  assert.equal(sampleBookingEmbedHtml().includes('\u2014'), false);
});

test('notification copy has matching EN/ES keys and no em dashes', () => {
  const keys = Object.keys(appEn).filter((key) => key.startsWith('notif.'));
  assert.ok(keys.length >= 10);
  for (const key of keys) {
    assert.equal(typeof appEs[key as keyof typeof appEs], 'string');
    assert.equal(appEn[key as keyof typeof appEn].includes('\u2014'), false, key);
    assert.equal(appEs[key as keyof typeof appEs].includes('\u2014'), false, key);
  }
});
