import { describe, expect, it } from 'vitest';
import { Record } from './record.js';

describe('Record', () => {
  it('assigns fields and defaults jsonClass', () => {
    const r = new Record({ foo: 1 } as object);
    expect(r.jsonClass).toBe('Record');
    expect((r as Record & { foo: number }).foo).toBe(1);
    expect(r.getJsonClass()).toBe('Record');
  });

  it('allows subclass to override jsonClass via assigned fields', () => {
    const r = new Record({ jsonClass: 'Custom' });
    expect(r.jsonClass).toBe('Custom');
    expect(r.getJsonClass()).toBe('Custom');
  });
});
