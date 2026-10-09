import { describe, expect, it } from 'bun:test';
import { BD_DISTRICTS } from '@/lib/bd-districts';

describe('BD_DISTRICTS', () => {
  it('contains all 64 official districts (DATA-11)', () => {
    expect(BD_DISTRICTS.length).toBe(64);
  });

  it('has no duplicates', () => {
    expect(new Set(BD_DISTRICTS).size).toBe(BD_DISTRICTS.length);
  });

  it('spells Jhalokati correctly', () => {
    expect(BD_DISTRICTS).toContain('Jhalokati');
  });

  it('includes Chapai Nawabganj', () => {
    expect(BD_DISTRICTS).toContain('Chapai Nawabganj');
  });
});
