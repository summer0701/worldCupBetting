import { describe, expect, it } from 'vitest';

import { normalizeAppsScriptUrl } from './api';

describe('Apps Script API utilities', () => {
  it('trims the configured Apps Script URL', () => {
    expect(normalizeAppsScriptUrl('  https://script.google.com/macros/s/abc/exec  '))
      .toBe('https://script.google.com/macros/s/abc/exec');
  });

  it('removes Google account indexes from copied Apps Script URLs', () => {
    expect(normalizeAppsScriptUrl('https://script.google.com/macros/u/0/s/abc/exec'))
      .toBe('https://script.google.com/macros/s/abc/exec');
    expect(normalizeAppsScriptUrl('https://script.google.com/macros/u/12/s/abc/exec'))
      .toBe('https://script.google.com/macros/s/abc/exec');
  });

  it('handles missing URL values as an empty string', () => {
    expect(normalizeAppsScriptUrl()).toBe('');
    expect(normalizeAppsScriptUrl(null)).toBe('');
  });
});
