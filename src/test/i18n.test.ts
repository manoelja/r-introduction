import { describe, it, expect } from 'vitest';
import i18n from '../i18n';

describe('i18n setup', () => {
  it('disponibiliza pt, en e es como idiomas', () => {
    const languages = Object.keys(i18n.options.resources ?? {});
    expect(languages).toEqual(expect.arrayContaining(['pt', 'en', 'es']));
  });

  it('tem fallback para pt', () => {
    expect(i18n.options.fallbackLng).toEqual(expect.arrayContaining(['pt']));
  });
});
