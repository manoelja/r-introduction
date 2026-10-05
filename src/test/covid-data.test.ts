import { describe, it, expect } from 'vitest';
import {
  cleaningStats,
  summaryStats,
  seriesNacional,
  goianiaSeries,
  regionSeries,
  regionData,
  ufData,
  municipioData,
  metroInteriorData,
  REGIOES,
} from '../data/covid';

describe('cleaningStats (Item 2)', () => {
  it('registros brutos, finais e removidos', () => {
    expect(cleaningStats.initialRecords).toBe(296_323);
    expect(cleaningStats.finalRecords).toBe(289_640);
    expect(cleaningStats.removedRecords).toBe(6_683);
    expect(cleaningStats.initialRecords - cleaningStats.finalRecords).toBe(cleaningStats.removedRecords);
  });

  it('etapas de remoção consistentes com a soma', () => {
    const totalEtapas = cleaningStats.steps.reduce((acc, s) => acc + s.removed, 0);
    expect(totalEtapas).toBe(cleaningStats.removedRecords);
    const [semMunicipio, semana53, duplicatas] = cleaningStats.steps;
    expect(semMunicipio.removed).toBe(1_113);
    expect(semana53.removed).toBe(5_570);
    expect(duplicatas.removed).toBe(0);
  });

  it('correções de casos novos negativos', () => {
    expect(cleaningStats.corrections[0].count).toBe(4);
    expect(cleaningStats.corrections[0].action).toContain('pmax');
  });
});

describe('summaryStats (Item 6 — Goiânia 2021)', () => {
  it('totais de Goiânia conferem com o r-introduction.Rmd', () => {
    const g = summaryStats.goiania;
    expect(g.casosAcumulados).toBe(216_065);
    expect(g.obitosAcumulados).toBe(6_991);
    expect(g.casosNovos).toBe(42_422);
    expect(g.obitosNovos).toBe(1_850);
  });

  it('52 semanas epidemiológicas de 2021', () => {
    expect(summaryStats.goiania.semanas).toBe(52);
    expect(goianiaSeries).toHaveLength(52);
  });

  it('totais nacionais consistentes', () => {
    expect(summaryStats.totalRegistros).toBe(289_640);
    expect(summaryStats.totalMunicipios).toBe(5_570);
    expect(summaryStats.totalUFs).toBe(27);
  });
});

describe('séries semanais', () => {
  it('série nacional cobre as semanas 1 a 52', () => {
    expect(seriesNacional).toHaveLength(52);
    const semanas = seriesNacional.map((s) => s.semana);
    expect(Math.min(...semanas)).toBe(1);
    expect(Math.max(...semanas)).toBe(52);
    expect(new Set(semanas).size).toBe(52);
  });

  it('série de Goiânia cobre as semanas 1 a 52 e é monotônica', () => {
    const semanas = goianiaSeries.map((s) => s.semana);
    expect(new Set(semanas).size).toBe(52);
    for (let i = 1; i < goianiaSeries.length; i++) {
      expect(goianiaSeries[i].casosAcumulados).toBeGreaterThanOrEqual(goianiaSeries[i - 1].casosAcumulados);
      expect(goianiaSeries[i].obitosAcumulados).toBeGreaterThanOrEqual(goianiaSeries[i - 1].obitosAcumulados);
    }
  });

  it('série por região: 5 regiões × 52 semanas', () => {
    expect(regionSeries).toHaveLength(260);
    for (const regiao of REGIOES) {
      expect(regionSeries.filter((s) => s.regiao === regiao)).toHaveLength(52);
    }
  });
});

describe('agregados', () => {
  it('regiões na ordem canônica com 27 UFs no total', () => {
    expect(regionData).toHaveLength(5);
    expect(regionData.map((r) => r.regiao)).toEqual(REGIOES);
    expect(regionData.reduce((acc, r) => acc + r.ufs.length, 0)).toBe(27);
  });

  it('27 UFs com dados válidos', () => {
    expect(ufData).toHaveLength(27);
    expect(new Set(ufData.map((u) => u.uf)).size).toBe(27);
    for (const u of ufData) {
      expect(u.casosAcumulados).toBeGreaterThan(0);
      expect(u.obitosAcumulados).toBeGreaterThan(0);
      expect(REGIOES).toContain(u.regiao);
    }
  });

  it('5.570 municípios (pares UF|município) com Goiânia presente', () => {
    expect(municipioData).toHaveLength(5_570);
    const goiania = municipioData.find((m) => m.municipio === 'Goiânia' && m.uf === 'GO');
    expect(goiania).toBeDefined();
    expect(goiania!.casosAcumulados).toBe(216_065);
    expect(goiania!.obitosAcumulados).toBe(6_991);
  });

  it('Metro/Interior com 2 grupos', () => {
    expect(metroInteriorData).toHaveLength(2);
    expect(metroInteriorData.map((m) => m.grupo).sort()).toEqual(['Interior', 'Reg. Metropolitana']);
  });
});

describe('qualidade dos dados', () => {
  it('sem NaN/undefined em valores numéricos', () => {
    const numeric = (v: unknown) => typeof v === 'number' && !Number.isNaN(v);
    for (const s of [...seriesNacional, ...goianiaSeries, ...regionSeries]) {
      expect(numeric(s.casosAcumulados)).toBe(true);
      expect(numeric(s.casosNovos)).toBe(true);
      expect(numeric(s.obitosAcumulados)).toBe(true);
      expect(numeric(s.obitosNovos)).toBe(true);
    }
    for (const m of municipioData) {
      expect(numeric(m.casosAcumulados)).toBe(true);
      expect(numeric(m.obitosAcumulados)).toBe(true);
    }
  });
});
