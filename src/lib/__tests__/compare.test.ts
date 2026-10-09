import { beforeEach, describe, expect, it } from 'bun:test';
import {
  addToCompare,
  clearCompare,
  getCompareIds,
  MAX_COMPARE,
  removeFromCompare,
} from '@/lib/compare';

describe('compare list (lib/compare)', () => {
  beforeEach(() => {
    // jsdom provides localStorage on its window; surface it to the module
    // under test just like a real browser would.
    globalThis.localStorage = window.localStorage;
    localStorage.clear();
  });

  it('adds a product once and reports existing ids (idempotent)', () => {
    expect(addToCompare('p1')).toBe('added');
    expect(addToCompare('p1')).toBe('exists');
    expect(getCompareIds()).toEqual(['p1']);
  });

  it('rejects when the compare list is full', () => {
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(addToCompare(id)).toBe('added');
    }
    expect(addToCompare('e')).toBe('full');
    expect(getCompareIds()).toEqual(['a', 'b', 'c', 'd']);
    expect(MAX_COMPARE).toBe(4);
  });

  it('removes a product without touching the rest', () => {
    addToCompare('p1');
    addToCompare('p2');
    removeFromCompare('p1');
    expect(getCompareIds()).toEqual(['p2']);
    // Removing an id that is not present is a no-op.
    removeFromCompare('missing');
    expect(getCompareIds()).toEqual(['p2']);
  });

  it('clears the whole list', () => {
    addToCompare('p1');
    clearCompare();
    expect(getCompareIds()).toEqual([]);
  });
});
