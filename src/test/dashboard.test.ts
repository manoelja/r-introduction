import { describe, it, expect } from 'vitest';
import {
  buildComparativo,
  buildSerieSemanal,
  filtrosVazios,
  REGIOES_ORDER,
} from '../components/Dashboard/aggregate';
import { summaryStats } from '../data/covid';

// Ordem canônica exposta para o teste
const REGIOES = REGIOES_ORDER;

describe('buildComparativo — nível região', () => {
  it('sem filtros, retorna as 5 regiões na ordem canônica', () => {
    const rows = buildComparativo(filtrosVazios, 'regiao', null, null);
    expect(rows.map((r) => r.label)).toEqual(REGIOES);
    expect(rows.every((r) => r.drillable)).toBe(true);
  });

  it('todas as regiões são drillable e os totais somam o nacional', () => {
    const rows = buildComparativo(filtrosVazios, 'regiao', null, null);
    const totalCasos = rows.reduce((acc, r) => acc + r.values.casosAcumulados, 0);
    const totalMunicipios = summaryStats.totalMunicipios;
    expect(totalCasos).toBeGreaterThan(0);
    expect(rows.reduce((acc, r) => acc + r.values.casosNovos, 0)).toBeGreaterThan(0);
    // 5.570 municípios distribuídos nas 5 regiões
    expect(totalMunicipios).toBe(5_570);
  });

  it('filtro por região restringe as regiões exibidas', () => {
    const rows = buildComparativo({ ...filtrosVazios, regioes: ['Sudeste', 'Sul'] }, 'regiao', null, null);
    expect(rows.map((r) => r.label)).toEqual(['Sudeste', 'Sul']);
  });
});

describe('buildComparativo — drill-down', () => {
  it('nível UF com drillRegion retorna apenas as UFs da região', () => {
    const rows = buildComparativo(filtrosVazios, 'uf', 'Centro-Oeste', null);
    expect(rows.map((r) => r.label).sort()).toEqual(['DF', 'GO', 'MS', 'MT']);
    expect(rows.every((r) => r.drillable)).toBe(true);
  });

  it('nível município com drillUF retorna municípios de Goiás incluindo Goiânia', () => {
    const rows = buildComparativo(filtrosVazios, 'municipio', 'Centro-Oeste', 'GO');
    expect(rows.length).toBeGreaterThan(100);
    const goiania = rows.find((r) => r.label === 'Goiânia');
    expect(goiania).toBeDefined();
    expect(goiania!.values.casosAcumulados).toBe(216_065);
    expect(goiania!.values.obitosAcumulados).toBe(6_991);
  });

  it('filtro UF no nível uf retorna exatamente as UFs selecionadas', () => {
    // Com UFs selecionadas, o dashboard agrupa por estado (não por região):
    // as UFs escolhidas devem aparecer como linhas, com valores do estado
    const rows = buildComparativo({ ...filtrosVazios, ufs: ['GO', 'SP'] }, 'uf', null, null);
    expect(rows.map((r) => r.label).sort()).toEqual(['GO', 'SP']);
    expect(rows.every((r) => r.group === 'UF')).toBe(true);
    const go = rows.find((r) => r.label === 'GO');
    expect(go!.values.casosAcumulados).toBeGreaterThan(0);
  });

  it('filtro metroInterior funciona no nível município', () => {
    const interior = buildComparativo({ ...filtrosVazios, metroInterior: ['Interior'] }, 'municipio', 'Centro-Oeste', 'GO');
    const metro = buildComparativo({ ...filtrosVazios, metroInterior: ['Reg. Metropolitana'] }, 'municipio', 'Centro-Oeste', 'GO');
    expect(interior.every((r) => r.label !== 'Goiânia')).toBe(true);
    expect(metro.some((r) => r.label === 'Goiânia')).toBe(true);
  });
});

describe('buildComparativo — eixo Metro/Interior', () => {
  it('nível metroInterior sem filtros retorna as 2 categorias na ordem canônica', () => {
    const rows = buildComparativo(filtrosVazios, 'metroInterior', null, null);
    expect(rows.map((r) => r.label)).toEqual(['Reg. Metropolitana', 'Interior']);
    expect(rows.every((r) => r.group === 'Metro/Interior')).toBe(true);
    expect(rows.every((r) => !r.drillable)).toBe(true);
    expect(rows.every((r) => r.values.casosAcumulados > 0)).toBe(true);
  });

  it('nível metroInterior respeita o filtro de região', () => {
    const rows = buildComparativo({ ...filtrosVazios, regioes: ['Centro-Oeste'] }, 'metroInterior', null, null);
    expect(rows.map((r) => r.label)).toEqual(['Reg. Metropolitana', 'Interior']);
    const somaCentroOeste = rows.reduce((a, r) => a + r.values.casosAcumulados, 0);
    const todas = buildComparativo(filtrosVazios, 'regiao', null, null);
    const centroOeste = todas.find((r) => r.label === 'Centro-Oeste')!;
    expect(somaCentroOeste).toBe(centroOeste.values.casosAcumulados);
  });

  it('nível uf sem filtros retorna as 27 UFs (eixo ao abrir o filtro UF)', () => {
    const rows = buildComparativo(filtrosVazios, 'uf', null, null);
    expect(rows).toHaveLength(27);
    expect(rows.every((r) => r.group === 'UF')).toBe(true);
  });
});

describe('buildSerieSemanal', () => {
  it('Goiânia retorna 52 semanas', () => {
    const [serie] = buildSerieSemanal('goiania', [], 'casosAcumulados');
    expect(serie.pontos).toHaveLength(52);
    expect(serie.pontos[51].valor).toBe(216_065);
  });

  it('Nacional retorna 52 semanas', () => {
    const [serie] = buildSerieSemanal('nacional', [], 'obitosAcumulados');
    expect(serie.pontos).toHaveLength(52);
    expect(serie.pontos[51].valor).toBeGreaterThan(0);
  });

  it('regiões retorna uma série por região (5 por padrão)', () => {
    const series = buildSerieSemanal('regioes', [], 'obitosAcumulados');
    expect(series).toHaveLength(5);
    expect(series.every((s) => s.pontos.length === 52)).toBe(true);
  });

  it('regiões selecionadas limitam as séries', () => {
    const series = buildSerieSemanal('regioes', ['Norte'], 'casosAcumulados');
    expect(series.map((s) => s.nome)).toEqual(['Norte']);
  });
});
