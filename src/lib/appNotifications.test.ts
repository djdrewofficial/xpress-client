import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseMessage,
  parseMessagesPayload,
  parsePopup,
  parseScreen,
} from './appNotificationsParse.ts';

test('parseMessagesPayload maps messages and popups', () => {
  const parsed = parseMessagesPayload({
    messages: [
      {
        id: 'm1',
        title: 'Hello',
        body: 'Body',
        deep_link: 'xpressclient://tab/music',
        tap_action: 'tab',
        tap_tab: 'music',
        screen_id: null,
        show_as_popup: true,
        status: 'sent',
        queued_at: '2026-01-01T00:00:00Z',
        sent_at: '2026-01-01T00:01:00Z',
      },
    ],
    popups: [
      {
        id: 'm1',
        title: 'Hello',
        body: 'Body',
        deep_link: 'xpressclient://tab/music',
        screen_id: null,
      },
    ],
  });
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.messages[0]?.tap_action, 'tab');
  assert.equal(parsed.messages[0]?.tap_tab, 'music');
  assert.equal(parsed.popups.length, 1);
  assert.equal(parsed.popups[0]?.id, 'm1');
});

test('parseMessage rejects rows without an id', () => {
  assert.equal(parseMessage({ title: 'x' }), null);
});

test('parseMessage normalizes unknown tap_action to none', () => {
  const msg = parseMessage({
    id: 'x',
    title: 't',
    body: '',
    deep_link: '',
    tap_action: 'weird',
    show_as_popup: false,
    status: 'sent',
    queued_at: '',
  });
  assert.equal(msg?.tap_action, 'none');
});

test('parsePopup keeps screen_id when present', () => {
  const popup = parsePopup({
    id: 'p1',
    title: 'Book',
    body: 'Meet your DJ',
    deep_link: 'xpressclient://screen/abc',
    screen_id: 'abc',
  });
  assert.equal(popup?.screen_id, 'abc');
});

test('parseScreen reads buttons, embed, and allowed origins', () => {
  const screen = parseScreen({
    id: 's1',
    name: 'Booking',
    heading: 'Schedule',
    body_html: '<p>Hi</p>',
    buttons: [
      { label: 'Open calendar', action: 'url', url: 'https://example.com' },
      { label: 'Home', action: 'tab', tab: 'home' },
      { label: 'Close', action: 'dismiss' },
      { label: 'Bad', action: 'nope' },
    ],
    embed_html: '<iframe src="https://calendar.example.com/book"></iframe>',
    dj: { name: 'Alex', booking_url: 'https://book.example.com' },
    render: {
      mode: 'webview_sandbox',
      allowed_origins: ['https://calendar.example.com'],
      open_links: 'external',
    },
  });
  assert.ok(screen);
  assert.equal(screen?.buttons.length, 3);
  assert.equal(screen?.embed_html?.includes('iframe'), true);
  assert.deepEqual(screen?.render.allowed_origins, ['https://calendar.example.com']);
  assert.equal(screen?.dj.name, 'Alex');
});

test('parseMessagesPayload tolerates missing arrays', () => {
  const parsed = parseMessagesPayload({});
  assert.deepEqual(parsed.messages, []);
  assert.deepEqual(parsed.popups, []);
});
