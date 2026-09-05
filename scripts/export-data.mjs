/**
 * scripts/export-data.mjs
 *
 * Lê `dados-covid.xlsx` (casos e óbitos de COVID-19 — 2021, Ministério da Saúde),
 * replica a limpeza feita no `r-introducion.Rmd` (itens 2, 3 e 9) e gera
 * `src/data/covid.ts` com os dados agregados consumidos pelo dashboard.
 *
 * Uso: npm run data:export
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const XLSX_PATH = join(ROOT, 'dados-covid.xlsx');
const OUT_PATH = join(ROOT, 'src', 'data', 'covid.ts');

// ---------------------------------------------------------------------------
// 1. Leitura do XLSX
// ---------------------------------------------------------------------------
const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);

const HEADERS = [
  'info',
  'uf',
  'municipio',
  'metroInterior',
  'anoSemana',
  'casosAcumulados',
  'casosNovos',
  'obitosAcumulados',
  'obitosNovos',
];

const toRecord = (r) => ({
  info: r[0],
  uf: r[1],
  municipio: r[2],
  metroInterior: r[3],
  anoSemana: r[4],
  casosAcumulados: Number(r[5]),
  casosNovos: Number(r[6]),
  obitosAcumulados: Number(r[7]),
  obitosNovos: Number(r[8]),
});

// ---------------------------------------------------------------------------
// 2. Limpeza (espelha os itens 2, 3 e 9 do r-introducion.Rmd)
// ---------------------------------------------------------------------------
const UF_REGIAO = {
  AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste',
  PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
};
const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

// Etapa 1: remover registros sem município
const semMunicipio = [];
const comMunicipio = [];
for (const r of rawRows) {
  const rec = toRecord(r);
  if (rec.municipio === null || String(rec.municipio).trim() === '') {
    semMunicipio.push(rec);
  } else {
    comMunicipio.push(rec);
  }
}

// Etapa 2: extrair semana/ano e filtrar 2021, semanas 1-52
const corrigidosNegativos = [];
const semana53 = [];
const limpos = [];
for (const rec of comMunicipio) {
  const [semanaStr, anoStr] = String(rec.anoSemana).split('/');
  const semana = Number(semanaStr);
  const ano = Number(anoStr);
  if (!(ano === 2021 && semana >= 1 && semana <= 52)) {
    semana53.push(rec);
    continue;
  }
  // Corrigir valores negativos de casos novos (pmax(_, 0) no R)
  if (rec.casosNovos < 0) {
    corrigidosNegativos.push(rec.casosNovos);
    rec.casosNovos = 0;
  }
  rec.semana = semana;
  rec.ano = ano;
  rec.regiao = UF_REGIAO[rec.uf] ?? null;
  limpos.push(rec);
}

// Etapa 3: remover duplicatas completas
const vistos = new Set();
const unicos = [];
for (const rec of limpos) {
  const chave = `${rec.info}|${rec.uf}|${rec.municipio}|${rec.metroInterior}|${rec.anoSemana}|${rec.casosAcumulados}|${rec.casosNovos}|${rec.obitosAcumulados}|${rec.obitosNovos}`;
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  unicos.push(rec);
}

// ---------------------------------------------------------------------------
// 3. Agregações
// ---------------------------------------------------------------------------
// Soma semanal por grupo (região, UF) e série nacional/Goiânia
const sumPor = (grupos) => {
  const map = new Map();
  for (const rec of unicos) {
    const chave = grupos(rec);
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave).push(rec);
  }
  return map;
};

const porSemanaNacional = sumPor((r) => String(r.semana));
const porRegiaoSemana = sumPor((r) => `${r.regiao}|${r.semana}`);
const porUFSemana = sumPor((r) => `${r.uf}|${r.semana}`);
const porMunicipio = sumPor((r) => `${r.uf}|${r.municipio}`);
const porRegiao = sumPor((r) => r.regiao);
const porUF = sumPor((r) => r.uf);
const porMetroInterior = sumPor((r) => r.metroInterior);

const maxSemanaDe = (recs) => {
  let max = 0;
  for (const r of recs) if (r.semana > max) max = r.semana;
  return max;
};

const somarSemana = (recs) => recs.reduce(
  (acc, r) => ({
    casosAcumulados: acc.casosAcumulados + r.casosAcumulados,
    casosNovos: acc.casosNovos + r.casosNovos,
    obitosAcumulados: acc.obitosAcumulados + r.obitosAcumulados,
    obitosNovos: acc.obitosNovos + r.obitosNovos,
  }),
  { casosAcumulados: 0, casosNovos: 0, obitosAcumulados: 0, obitosNovos: 0 },
);

// Série nacional por semana
const seriesNacional = [...porSemanaNacional.entries()]
  .map(([semana, recs]) => ({ semana: Number(semana), ...somarSemana(recs) }))
  .sort((a, b) => a.semana - b.semana);

// Série Goiânia por semana (itens 7 e 8)
const goianiaRecs = unicos.filter((r) => r.municipio === 'Goiânia' && r.uf === 'GO');
const goianiaSeries = goianiaRecs
  .map((r) => ({
    semana: r.semana,
    casosAcumulados: r.casosAcumulados,
    casosNovos: r.casosNovos,
    obitosAcumulados: r.obitosAcumulados,
    obitosNovos: r.obitosNovos,
  }))
  .sort((a, b) => a.semana - b.semana);

// Série por região e semana (item 10)
const regionSeries = [...porRegiaoSemana.entries()]
  .map(([chave, recs]) => {
    const [regiao, semana] = chave.split('|');
    return { regiao, semana: Number(semana), ...somarSemana(recs) };
  })
  .sort((a, b) => REGIOES.indexOf(a.regiao) - REGIOES.indexOf(b.regiao) || a.semana - b.semana);

// Agregados por região (valores finais da semana 52)
const regionData = REGIOES.map((regiao) => {
  const serie = regionSeries.filter((s) => s.regiao === regiao);
  const ultima = serie[serie.length - 1];
  return {
    regiao,
    ufs: Object.keys(UF_REGIAO).filter((uf) => UF_REGIAO[uf] === regiao),
    municipios: new Set(porRegiao.get(regiao).map((r) => `${r.uf}|${r.municipio}`)).size,
    casosAcumulados: ultima.casosAcumulados,
    obitosAcumulados: ultima.obitosAcumulados,
    casosNovos: serie.reduce((a, s) => a + s.casosNovos, 0),
    obitosNovos: serie.reduce((a, s) => a + s.obitosNovos, 0),
  };
});

// Agregados por UF
const ufData = [...porUF.entries()]
  .map(([uf, recs]) => {
    const serie = [...porUFSemana.entries()]
      .filter(([chave]) => chave.startsWith(`${uf}|`))
      .sort((a, b) => Number(a[0].split('|')[1]) - Number(b[0].split('|')[1]));
    const ultima = serie[serie.length - 1][1];
    const fim = somarSemana(ultima);
    const novos = recs.reduce((a, r) => a + r.casosNovos, 0);
    const obitosNovos = recs.reduce((a, r) => a + r.obitosNovos, 0);
    return {
      uf,
      regiao: UF_REGIAO[uf],
      municipios: new Set(recs.map((r) => r.municipio)).size,
      casosAcumulados: fim.casosAcumulados,
      obitosAcumulados: fim.obitosAcumulados,
      casosNovos: novos,
      obitosNovos,
    };
  })
  .sort((a, b) => a.uf.localeCompare(b.uf));

// Agregados por município (drill-down)
const municipioData = [...porMunicipio.entries()]
  .map(([chave, recs]) => {
    const [uf, municipio] = chave.split('|');
    const maxSemana = maxSemanaDe(recs);
    const final = recs.find((r) => r.semana === maxSemana);
    return {
      municipio,
      uf,
      regiao: UF_REGIAO[uf],
      metroInterior: recs[0].metroInterior,
      casosAcumulados: final.casosAcumulados,
      obitosAcumulados: final.obitosAcumulados,
      casosNovos: recs.reduce((a, r) => a + r.casosNovos, 0),
      obitosNovos: recs.reduce((a, r) => a + r.obitosNovos, 0),
    };
  })
  .sort((a, b) => (a.uf === b.uf ? a.municipio.localeCompare(b.municipio) : a.uf.localeCompare(b.uf)));

// Metro vs Interior
const metroInteriorData = ['Reg. Metropolitana', 'Interior']
  .map((grupo) => {
    const recs = porMetroInterior.get(grupo) ?? [];
    const maxSemana = maxSemanaDe(recs);
    const final = recs.find((r) => r.semana === maxSemana);
    return {
      grupo,
      casosAcumulados: final.casosAcumulados,
      obitosAcumulados: final.obitosAcumulados,
      casosNovos: recs.reduce((a, r) => a + r.casosNovos, 0),
      obitosNovos: recs.reduce((a, r) => a + r.obitosNovos, 0),
    };
  });

// Estatísticas de limpeza (itens 2 e 3)
const cleaningStats = {
  initialRecords: rawRows.length,
  finalRecords: unicos.length,
  removedRecords: rawRows.length - unicos.length,
  steps: [
    { label: 'Município ausente', removed: semMunicipio.length, reason: 'Registros agregados por UF, sem município identificado' },
    { label: 'Semana 53 (fora do calendário)', removed: semana53.length, reason: 'Semana epidemiológica 53 fora do ano-calendário 2021' },
    { label: 'Duplicatas', removed: limpos.length - unicos.length, reason: 'Registros completamente duplicados' },
  ],
  corrections: [
    { label: 'Casos novos negativos', count: corrigidosNegativos.length, action: 'Corrigidos para 0 (pmax)' },
  ],
};

// Resumo de Goiânia (item 6)
const resumoGoiania = {
  casosAcumulados: Math.max(...goianiaSeries.map((s) => s.casosAcumulados)),
  obitosAcumulados: Math.max(...goianiaSeries.map((s) => s.obitosAcumulados)),
  casosNovos: goianiaSeries.reduce((a, s) => a + s.casosNovos, 0),
  obitosNovos: goianiaSeries.reduce((a, s) => a + s.obitosNovos, 0),
  semanas: goianiaSeries.length,
};

const summaryStats = {
  totalRegistros: unicos.length,
  totalMunicipios: municipioData.length,
  totalUFs: ufData.length,
  goiania: resumoGoiania,
};

// Tabela de mapeamento de colunas (documenta o item 2)
const deParaColunas = [
  { antigo: 'Info', novo: 'info' },
  { antigo: 'UF', novo: 'uf' },
  { antigo: 'Município', novo: 'municipio' },
  { antigo: 'Metro/Interior', novo: 'metroInterior' },
  { antigo: 'Ano_Semana', novo: 'anoSemana (semana + ano)' },
  { antigo: 'Casos Acumulados', novo: 'casosAcumulados' },
  { antigo: 'Casos novos notificados na semana epidemiológica', novo: 'casosNovos' },
  { antigo: 'Óbitos Acumulados', novo: 'obitosAcumulados' },
  { antigo: 'Óbitos novos notificados na semana epidemiológica', novo: 'obitosNovos' },
];

// ---------------------------------------------------------------------------
// 4. Serialização → src/data/covid.ts
// ---------------------------------------------------------------------------
const header = `// Gerado por scripts/export-data.mjs — NÃO edite manualmente.
// Para regenerar: npm run data:export
// Fonte: dados-covid.xlsx (Ministério da Saúde — casos e óbitos de COVID-19, 2021)
`;

const tipos = `
export interface CleaningStep {
  label: string;
  removed: number;
  reason: string;
}

export interface Correction {
  label: string;
  count: number;
  action: string;
}

export interface CleaningStats {
  initialRecords: number;
  finalRecords: number;
  removedRecords: number;
  steps: CleaningStep[];
  corrections: Correction[];
}

export interface WeeklySeries {
  semana: number;
  casosAcumulados: number;
  casosNovos: number;
  obitosAcumulados: number;
  obitosNovos: number;
}

export interface RegionWeekly extends WeeklySeries {
  regiao: string;
}

export interface RegionData {
  regiao: string;
  ufs: string[];
  municipios: number;
  casosAcumulados: number;
  obitosAcumulados: number;
  casosNovos: number;
  obitosNovos: number;
}

export interface UFData {
  uf: string;
  regiao: string;
  municipios: number;
  casosAcumulados: number;
  obitosAcumulados: number;
  casosNovos: number;
  obitosNovos: number;
}

export interface MunicipioData {
  municipio: string;
  uf: string;
  regiao: string;
  metroInterior: string;
  casosAcumulados: number;
  obitosAcumulados: number;
  casosNovos: number;
  obitosNovos: number;
}

export interface MetroInteriorData {
  grupo: string;
  casosAcumulados: number;
  obitosAcumulados: number;
  casosNovos: number;
  obitosNovos: number;
}

export interface DeParaColuna {
  antigo: string;
  novo: string;
}
`;

const js = (label, value) => `export const ${label} = ${JSON.stringify(value, null, 2)};\n`;

const content = [
  header,
  tipos,
  `export const REGIOES = ${JSON.stringify(REGIOES)};\n`,
  js('cleaningStats', cleaningStats),
  js('summaryStats', summaryStats),
  js('seriesNacional', seriesNacional),
  js('goianiaSeries', goianiaSeries),
  js('regionSeries', regionSeries),
  js('regionData', regionData),
  js('ufData', ufData),
  js('municipioData', municipioData),
  js('metroInteriorData', metroInteriorData),
  js('deParaColunas', deParaColunas),
  '',
].join('\n');

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, content, 'utf8');

// ---------------------------------------------------------------------------
// 5. Relatório
// ---------------------------------------------------------------------------
const sizeKb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
console.log('=== Relatório da exportação ===');
console.log(`Registros brutos:        ${cleaningStats.initialRecords.toLocaleString('pt-BR')}`);
console.log(`Registros finais:        ${cleaningStats.finalRecords.toLocaleString('pt-BR')} (removidos: ${cleaningStats.removedRecords.toLocaleString('pt-BR')})`);
console.log(`  - sem município:       ${cleaningStats.steps[0].removed.toLocaleString('pt-BR')}`);
console.log(`  - semana 53:           ${cleaningStats.steps[1].removed.toLocaleString('pt-BR')}`);
console.log(`  - duplicatas:          ${cleaningStats.steps[2].removed}`);
console.log(`  - negativos corrigidos: ${cleaningStats.corrections[0].count}`);
console.log(`Municípios:              ${municipioData.length.toLocaleString('pt-BR')}`);
console.log(`Goiânia 2021 (item 6):   ${resumoGoiania.casosAcumulados.toLocaleString('pt-BR')} casos acum. | ${resumoGoiania.obitosAcumulados.toLocaleString('pt-BR')} óbitos acum. | ${resumoGoiania.casosNovos.toLocaleString('pt-BR')} casos novos | ${resumoGoiania.obitosNovos.toLocaleString('pt-BR')} óbitos novos`);
console.log(`Arquivo gerado:          ${OUT_PATH} (${sizeKb} KB)`);
