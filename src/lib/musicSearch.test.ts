import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickSearchHit } from './musicSearchMatch.ts';

test('pickSearchHit prefers an exact title and artist match', () => {
  const hit = pickSearchHit(
    [
      { title: 'At Last', artist: 'Etta James', artworkUrl: 'a' },
      { title: "Can't Help Falling in Love", artist: 'Elvis Presley', artworkUrl: 'b' },
      { title: "Can't Help Falling in Love", artist: 'Other', artworkUrl: 'c' },
    ],
    "Can't Help Falling in Love",
    'Elvis Presley',
  );
  assert.equal(hit?.artworkUrl, 'b');
});

test('pickSearchHit falls back to title-only then the first result', () => {
  assert.equal(
    pickSearchHit(
      [
        { title: 'Dancing Queen', artist: 'Cover Band', artworkUrl: '1' },
        { title: 'Dancing Queen', artist: 'ABBA', artworkUrl: '2' },
      ],
      'Dancing Queen',
      null,
    )?.artworkUrl,
    '1',
  );
  assert.equal(pickSearchHit([], 'Missing', 'Artist'), null);
  assert.equal(
    pickSearchHit([{ title: 'Other', artist: 'A', artworkUrl: 'z' }], 'Nope', 'A')?.artworkUrl,
    'z',
  );
});
