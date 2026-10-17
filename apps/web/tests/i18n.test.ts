import { describe, it, expect } from 'vitest';
import { t, strings } from '../src/i18n/strings';

describe('i18n', () => {
  it('defaults to French', () => {
    expect(t('appName', 'fr')).toBe('FAME');
    expect(t('waiting', 'fr')).toBe('En attente');
  });

  it('provides English translations for all keys', () => {
    const frKeys = Object.keys(strings.fr);
    const enKeys = Object.keys(strings.en);
    expect(enKeys.sort()).toEqual(frKeys.sort());
  });
});
