import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PRIMITIVES,
  buildPrimitiveSet,
  configurePrimitives,
  getPrimitiveSet,
  isKnownLibrary,
  isPrimitive,
} from '../src/primitives/registry.js';

test('default primitives include Radix Dialog', () => {
  const set = buildPrimitiveSet();
  assert.ok(set.has('Dialog'));
  assert.ok(set.has('DialogContent'));
});

test('buildPrimitiveSet merges config primitives', () => {
  const set = buildPrimitiveSet({ primitives: { 'my-lib': ['FancyButton'] } });
  assert.ok(set.has('FancyButton'));
  assert.ok(set.has('Dialog'));
});

test('configurePrimitives affects getPrimitiveSet and isKnownLibrary', () => {
  configurePrimitives({ primitives: { 'my-lib': ['FancyButton'] } });
  const set = getPrimitiveSet();
  assert.ok(set.has('FancyButton'));
  assert.ok(isKnownLibrary('my-lib'));
  assert.ok(!isKnownLibrary('unknown-lib'));
  // reset
  configurePrimitives({});
});

test('isPrimitive requires a known library source', () => {
  const set = buildPrimitiveSet();
  assert.equal(isPrimitive('Dialog', '@radix-ui/react-dialog', set), true);
  assert.equal(isPrimitive('Dialog', './local-dialog', set), false);
  assert.equal(isPrimitive('dialog', '@radix-ui/react-dialog', set), false); // intrinsic
  assert.equal(isPrimitive('Button', null, set), false);
});

test('isKnownLibrary matches exact and partial sources', () => {
  assert.ok(isKnownLibrary('@radix-ui/react-dialog'));
  assert.ok(isKnownLibrary('@headlessui/react'));
  assert.ok(!isKnownLibrary('./components/Button'));
});