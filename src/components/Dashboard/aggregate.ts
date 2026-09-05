import {
  municipioData,
  goianiaSeries,
  seriesNacional,
  regionSeries,
  REGIOES,
  type MunicipioData,
  type WeeklySeries,
} from '../../data/covid';

export type Metric = 'casosAcumulados' | 'casosNovos' | 'obitosAcumulados' | 'obitosNovos';

export const METRICS: Metric[] = ['casosAcumulados', 'casosNovos', 'obitosAcumulados', 'obitosNovos'];

export const metricLabels: Record<Metric, Record<'pt' | 'en' | 'es', string>> = {
  casosAcumulados: { pt: 'Casos acumulados', en: 'Cumulative cases', es: 'Casos acumulados' },
  casosNovos: { pt: 'Casos novos', en: 'New cases', es: 'Casos nuevos' },
  obitosAcumulados: { pt: 'Óbitos acumulados', en: 'Cumulative deaths', es: 'Muertes acumuladas' },
  obitosNovos: { pt: 'Óbitos novos', en: 'New deaths', es: 'Muertes nuevas' },
};

export type Nivel = 'regiao' | 'uf' | 'municipio' | 'metroInterior';
export type EscopoSerie = 'goiania' | 'nacional' | 'regioes';

/** Ordem canônica das categorias Metro/Interior (usada no eixo e no painel de filtro). */
export const METRO_INTERIOR_OPCOES = ['Reg. Metropolitana', 'Interior'];

/** Ordem canônica das regiões brasileiras. */
export const REGIOES_ORDER = REGIOES;

export interface Filtros {
  regioes: string[];
  ufs: string[];
  metroInterior: string[];
}

export const filtrosVazios: Filtros = { regioes: [], ufs: [], metroInterior: [] };

export interface Valores {
  casosAcumulados: number;
  casosNovos: number;
  obitosAcumulados: number;
  obitosNovos: number;
}

export interface ChartRow {
  label: string;
  values: Valores;
  group: string;
  drillable: boolean;
}

export interface PontoSerie {
  semana: number;
  valor: number;
}

export interface SerieLinha {
  nome: string;
  pontos: PontoSerie[];
}

const vazio = (): Valores => ({ casosAcumulados: 0, casosNovos: 0, obitosAcumulados: 0, obitosNovos: 0 });

const somarMunicipio = (acc: Valores, m: MunicipioData): Valores => ({
  casosAcumulados: acc.casosAcumulados + m.casosAcumulados,
  casosNovos: acc.casosNovos + m.casosNovos,
  obitosAcumulados: acc.obitosAcumulados + m.obitosAcumulados,
  obitosNovos: acc.obitosNovos + m.obitosNovos,
});

/** Filtra os municípios pelos filtros ativos e pelo nível de drill-down. */
export function filtrarMunicipios(f: Filtros, drillRegion: string | null, drillUF: string | null): MunicipioData[] {
  return municipioData.filter(
    (m) =>
      (f.regioes.length === 0 || f.regioes.includes(m.regiao)) &&
      (f.ufs.length === 0 || f.ufs.includes(m.uf)) &&
      (f.metroInterior.length === 0 || f.metroInterior.includes(m.metroInterior)) &&
      (!drillRegion || m.regiao === drillRegion) &&
      (!drillUF || m.uf === drillUF),
  );
}

/**
 * Constrói as linhas do gráfico comparativo a partir dos municípios filtrados,
 * agrupando por região, UF ou listando municípios conforme o nível.
 */
export function buildComparativo(
  f: Filtros,
  nivel: Nivel,
  drillRegion: string | null,
  drillUF: string | null,
): ChartRow[] {
  const base = filtrarMunicipios(f, drillRegion, drillUF);

  if (nivel === 'municipio') {
    return base
      .map((m) => ({
        label: m.municipio,
        values: {
          casosAcumulados: m.casosAcumulados,
          casosNovos: m.casosNovos,
          obitosAcumulados: m.obitosAcumulados,
          obitosNovos: m.obitosNovos,
        },
        group: 'Município',
        drillable: false,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  const porGrupo = new Map<string, Valores>();
  for (const m of base) {
    const chave = nivel === 'uf' ? m.uf : nivel === 'metroInterior' ? m.metroInterior : m.regiao;
    porGrupo.set(chave, somarMunicipio(porGrupo.get(chave) ?? vazio(), m));
  }

  const rows: ChartRow[] = [...porGrupo.entries()].map(([label, values]) => ({
    label,
    values,
    group: nivel === 'uf' ? 'UF' : nivel === 'metroInterior' ? 'Metro/Interior' : 'Região',
    drillable: nivel !== 'metroInterior',
  }));

  if (nivel === 'regiao') {
    // Ordem canônica das regiões
    return REGIOES.filter((r) => porGrupo.has(r)).map((r) => rows.find((row) => row.label === r)!);
  }
  if (nivel === 'metroInterior') {
    // Ordem canônica: Reg. Metropolitana antes de Interior
    return METRO_INTERIOR_OPCOES.filter((g) => porGrupo.has(g)).map((g) => rows.find((row) => row.label === g)!);
  }
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

const extrairPonto = (s: WeeklySeries, metrica: Metric): PontoSerie => ({
  semana: s.semana,
  valor: s[metrica],
});

/** Série semanal (52 semanas de 2021) por escopo: Goiânia, Nacional ou regiões selecionadas. */
export function buildSerieSemanal(escopo: EscopoSerie, regioes: string[], metrica: Metric): SerieLinha[] {
  if (escopo === 'goiania') {
    return [{ nome: 'Goiânia', pontos: goianiaSeries.map((s) => extrairPonto(s, metrica)) }];
  }
  if (escopo === 'nacional') {
    return [{ nome: 'Brasil', pontos: seriesNacional.map((s) => extrairPonto(s, metrica)) }];
  }
  const selecionadas = regioes.length > 0 ? regioes : REGIOES;
  return selecionadas.map((reg) => ({
    nome: reg,
    pontos: regionSeries.filter((s) => s.regiao === reg).map((s) => extrairPonto(s, metrica)),
  }));
}

/** Cores fixas das regiões (usadas nas séries semanais empilhadas). */
export const regionColors: Record<string, string> = {
  Norte: '#66c2a5',
  Nordeste: '#fc8d62',
  'Centro-Oeste': '#8da0cb',
  Sudeste: '#e78ac3',
  Sul: '#a6d854',
};
