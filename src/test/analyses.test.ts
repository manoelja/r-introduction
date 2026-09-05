import { describe, it, expect } from 'vitest';
import { analysisResults } from '../data/analyses';

describe('analysisResults (10 itens da atividade)', () => {
  it('contém exatamente 10 itens', () => {
    expect(analysisResults).toHaveLength(10);
  });

  it('itens numerados de 1 a 10 em ordem', () => {
    expect(analysisResults.map((a) => a.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('todos os itens têm conteúdo em pt, en e es', () => {
    for (const item of analysisResults) {
      for (const campo of ['category', 'title', 'description', 'problem', 'result'] as const) {
        expect(item[campo].pt).toBeTruthy();
        expect(item[campo].en).toBeTruthy();
        expect(item[campo].es).toBeTruthy();
      }
      expect(item.tags.length).toBeGreaterThan(0);
    }
  });

  it('o item 6 menciona os totais reais de Goiânia', () => {
    const item6 = analysisResults.find((a) => a.id === 6);
    expect(item6?.result.pt).toContain('216.065');
    expect(item6?.result.pt).toContain('6.991');
  });
});
