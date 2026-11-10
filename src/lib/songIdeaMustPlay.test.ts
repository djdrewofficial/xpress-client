import assert from 'node:assert/strict';
import { test } from 'node:test';

import { songIdeaToAddPayload } from './songIdeaMustPlay.ts';

test('songIdeaToAddPayload maps title/artist onto a manual planning song', () => {
  assert.deepEqual(
    songIdeaToAddPayload({ id: 'idea-1', title: 'Dancing Queen', artist: 'ABBA' }),
    {
      title: 'Dancing Queen',
      artist: 'ABBA',
      provider: 'manual',
      provider_id: null,
      artwork_url: null,
      preview_url: null,
    },
  );
});

test('songIdeaToAddPayload trims and falls back when title or artist is empty', () => {
  assert.deepEqual(
    songIdeaToAddPayload({ id: 'idea-2', title: '  ', artist: '  ' }),
    {
      title: 'Untitled',
      artist: null,
      provider: 'manual',
      provider_id: null,
      artwork_url: null,
      preview_url: null,
    },
  );
  assert.deepEqual(
    songIdeaToAddPayload(
      { id: 'idea-3', title: ' At Last ', artist: null },
      { artworkUrl: 'https://art.example/cover.jpg', previewUrl: 'https://preview.example/a.m4a' },
    ),
    {
      title: 'At Last',
      artist: null,
      provider: 'manual',
      provider_id: null,
      artwork_url: 'https://art.example/cover.jpg',
      preview_url: 'https://preview.example/a.m4a',
    },
  );
});
