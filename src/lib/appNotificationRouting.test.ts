import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowWebViewNavigation,
  buildScreenDocument,
  hrefForTab,
  parseAppNotificationUrl,
  resolveNotificationTap,
  targetFromMessage,
  targetFromPopup,
  targetFromPushData,
} from './appNotificationRouting.ts';

test('hrefForTab maps shipped tabs and falls back My Event for unpaid surfaces', () => {
  assert.equal(hrefForTab('home'), '/');
  assert.equal(hrefForTab('planning'), '/');
  assert.equal(hrefForTab('timeline'), '/timeline');
  assert.equal(hrefForTab('music'), '/music');
  assert.equal(hrefForTab('payments'), '/you');
  assert.equal(hrefForTab('documents'), '/you');
  assert.equal(hrefForTab('guests'), '/you');
  assert.equal(hrefForTab('settings'), '/you');
  assert.equal(hrefForTab('unknown'), '/');
});

test('parseAppNotificationUrl reads message, screen, and tab deep links', () => {
  assert.deepEqual(parseAppNotificationUrl('xpressclient://message/abc-123'), {
    kind: 'message',
    messageId: 'abc-123',
  });
  assert.deepEqual(parseAppNotificationUrl('xpressclient://screen/scr-9'), {
    kind: 'screen',
    screenId: 'scr-9',
    href: '/notification-screen/scr-9',
  });
  assert.deepEqual(parseAppNotificationUrl('xpressclient://tab/music'), {
    kind: 'tab',
    tab: 'music',
    href: '/music',
  });
  assert.equal(parseAppNotificationUrl('https://example.com/nope'), null);
  assert.equal(parseAppNotificationUrl(''), null);
});

test('resolveNotificationTap prefers deep_link tab/screen over message id', () => {
  assert.deepEqual(
    resolveNotificationTap({
      deepLink: 'xpressclient://tab/timeline',
      messageId: 'm1',
      tapAction: 'none',
    }),
    { kind: 'tab', tab: 'timeline', href: '/timeline' },
  );
  assert.deepEqual(
    resolveNotificationTap({
      tapAction: 'screen',
      screenId: 's1',
      deepLink: 'xpressclient://message/m1',
    }),
    { kind: 'screen', screenId: 's1', href: '/notification-screen/s1' },
  );
});

test('targetFromMessage and targetFromPopup follow contract fields', () => {
  assert.deepEqual(
    targetFromMessage({
      id: 'm1',
      title: 't',
      body: 'b',
      deep_link: 'xpressclient://tab/home',
      tap_action: 'tab',
      tap_tab: 'home',
      screen_id: null,
      show_as_popup: true,
      status: 'sent',
      queued_at: '',
      sent_at: null,
    }),
    { kind: 'tab', tab: 'home', href: '/' },
  );
  assert.deepEqual(
    targetFromPopup({
      id: 'm2',
      title: 'Book',
      body: '',
      deep_link: 'xpressclient://screen/s2',
      screen_id: 's2',
    }),
    { kind: 'screen', screenId: 's2', href: '/notification-screen/s2' },
  );
});

test('targetFromPushData reads Expo data payload', () => {
  assert.deepEqual(
    targetFromPushData({ deepLink: 'xpressclient://tab/music', messageId: 'm9' }),
    { kind: 'tab', tab: 'music', href: '/music' },
  );
  assert.deepEqual(targetFromPushData({ messageId: 'only-id' }), {
    kind: 'message',
    messageId: 'only-id',
  });
  assert.deepEqual(targetFromPushData(null), { kind: 'none' });
});

test('allowWebViewNavigation sandboxes origins and opens other https externally', () => {
  const allowed = ['https://calendar.example.com'];
  assert.equal(allowWebViewNavigation('about:blank', allowed), 'allow');
  assert.equal(allowWebViewNavigation('https://calendar.example.com/book', allowed), 'allow');
  assert.equal(allowWebViewNavigation('https://other.example.com/x', allowed), 'external');
  assert.equal(allowWebViewNavigation('javascript:alert(1)', allowed), 'block');
  assert.equal(allowWebViewNavigation('file:///etc/passwd', allowed), 'block');
});

test('buildScreenDocument wraps body and a scrollable iframe embed', () => {
  const html = buildScreenDocument({
    bodyHtml: '<p>Hello</p>',
    embedHtml: '<iframe src="https://calendar.example.com/x"></iframe>',
    background: '#fff',
    ink: '#000',
    ink2: '#666',
  });
  assert.match(html, /<p>Hello<\/p>/);
  assert.match(html, /iframe src="https:\/\/calendar\.example\.com\/x"/);
  assert.match(html, /min-height: 640px/);
  assert.match(html, /-webkit-overflow-scrolling: touch/);
});
