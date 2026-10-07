import { describe, expect, it } from 'bun:test';
import { fallbackSlug, slugify } from '@/lib/slug';

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world test')).toBe('hello-world-test');
  });

  it('replaces multiple spaces with single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('hello!@#$% world')).toBe('hello-world');
  });

  it('removes leading hyphens', () => {
    expect(slugify('--hello-world')).toBe('hello-world');
  });

  it('removes trailing hyphens', () => {
    expect(slugify('hello-world--')).toBe('hello-world');
  });

  it('collapses consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles single word', () => {
    expect(slugify('Hello')).toBe('hello');
  });

  it('handles numbers', () => {
    expect(slugify('Product 123')).toBe('product-123');
  });

  it('handles unicode characters (removes them)', () => {
    expect(slugify('café')).toBe('caf');
  });

  it('transliterates Bangla shop names instead of stripping them', () => {
    expect(slugify('আল-আমিন স্টোর')).toBe('al-amin-stor');
  });

  it('transliterates Bangla words with vowel signs', () => {
    expect(slugify('বিক্রি')).toBe('bikri');
    expect(slugify('দোকান')).toBe('dokan');
  });

  it('transliterates Bangla digits', () => {
    expect(slugify('দোকান ১২৩')).toBe('dokan-123');
  });
});

describe('fallbackSlug', () => {
  it('produces a unique shop slug', () => {
    expect(fallbackSlug()).toMatch(/^shop-[0-9a-f]{8}$/);
    expect(fallbackSlug()).not.toBe(fallbackSlug());
  });
});
