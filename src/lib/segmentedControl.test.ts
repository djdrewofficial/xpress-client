import assert from 'node:assert/strict';
import test from 'node:test';

import { Brand } from './theme.ts';
import { SEGMENTED_MIN_HEIGHT, segmentedControlColors } from './segmentedControl.ts';

test('segmented control keeps a tappable minimum height', () => {
  assert.ok(SEGMENTED_MIN_HEIGHT >= 44);
});

test('light mode selected thumb uses brand purple with white label', () => {
  const tone = segmentedControlColors('light');
  assert.equal(tone.selectedBackground, Brand.purple);
  assert.equal(tone.selectedLabel, Brand.white);
  assert.equal(tone.selectedAccent, Brand.red);
  assert.notEqual(tone.trackBackground, tone.selectedBackground);
});

test('dark mode selected thumb uses a lighter purple for contrast', () => {
  const tone = segmentedControlColors('dark');
  assert.equal(tone.selectedBackground, Brand.purpleLight);
  assert.equal(tone.selectedLabel, Brand.white);
  assert.notEqual(tone.selectedBackground, Brand.purple);
  assert.notEqual(tone.trackBackground, tone.selectedBackground);
  assert.equal(tone.selectedAccent, Brand.red);
});

test('track border is present in both schemes so the control does not blend away', () => {
  const light = segmentedControlColors('light');
  const dark = segmentedControlColors('dark');
  assert.ok(light.trackBorder.length > 0);
  assert.ok(dark.trackBorder.length > 0);
  assert.notEqual(light.trackBorder, light.trackBackground);
  assert.notEqual(dark.trackBorder, dark.trackBackground);
});
