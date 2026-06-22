import { describe, expect, it } from 'vitest';

import { normalizeLoginCredentials } from './loginForm';

describe('login form utilities', () => {
  it('trims user name and password before login', () => {
    expect(normalizeLoginCredentials('  민수  ', '  pass123  ')).toEqual({
      name: '민수',
      password: 'pass123',
      isComplete: true,
    });
  });

  it('marks credentials incomplete when either field is empty after trimming', () => {
    expect(normalizeLoginCredentials('  ', 'pass123').isComplete).toBe(false);
    expect(normalizeLoginCredentials('민수', '  ').isComplete).toBe(false);
  });

  it('handles missing values safely', () => {
    expect(normalizeLoginCredentials(null, undefined)).toEqual({
      name: '',
      password: '',
      isComplete: false,
    });
  });
});
