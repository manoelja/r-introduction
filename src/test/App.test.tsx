import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../i18n';
import App from '../App';

describe('App', () => {
  it('renderiza as seções principais', () => {
    render(<App />);
    expect(screen.getAllByText(/COVID Goiânia/i).length).toBeGreaterThan(0);
    expect(document.querySelector('section#hero')).not.toBeNull();
    expect(document.querySelector('section#about')).not.toBeNull();
    expect(document.querySelector('section#skills')).not.toBeNull();
    expect(document.querySelector('section#projects')).not.toBeNull();
    expect(document.querySelector('section#dashboard')).not.toBeNull();
    expect(document.querySelector('footer#contact')).not.toBeNull();
  });

  it('mostra os registros reais do pipeline', () => {
    render(<App />);
    expect(screen.getAllByText('296.323').length).toBeGreaterThan(0);
    expect(screen.getAllByText('289.640').length).toBeGreaterThan(0);
  });
});
