import {
  goianiaSeries,
  seriesNacional,
  summaryStats,
  ufData,
  municipioData,
  metroInteriorData,
  REGIOES,
} from '../../data/covid';

export type LineType = 'input' | 'output' | 'success' | 'error' | 'info';

export interface Line {
  type: LineType;
  text: string;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

const pad = (s: string | number, len: number) => String(s).padEnd(len);

export const executarR = (cmd: string): Line[] => {
  const linhas: Line[] = [];
  const out = (t: string) => linhas.push({ type: 'output', text: t });
  const ok = (t: string) => linhas.push({ type: 'success', text: t });

  const g = goianiaSeries;
  const semanaRow = (r: (typeof g)[number]) =>
    `${pad(r.semana, 7)}${pad(r.casosAcumulados, 12)}${pad(r.casosNovos, 12)}${pad(r.obitosAcumulados, 12)}${pad(r.obitosNovos, 12)}`;

  const tabelaSemanas = (rows: typeof g, titulo: string) => {
    out(titulo);
    out(`${pad('semana', 7)}${pad('casos_acum', 12)}${pad('casos_novos', 12)}${pad('obitos_acum', 12)}obitos_novos`);
    rows.forEach((r) => out(semanaRow(r)));
  };

  if (/^head\(goiania\)$/.test(cmd)) tabelaSemanas(g.slice(0, 5), 'head(goiania) — primeiras 5 semanas');
  else if (/^tail\(goiania\)$/.test(cmd)) tabelaSemanas(g.slice(-5), 'tail(goiania) — últimas 5 semanas');
  else if (/^summary\(goiania\)$/.test(cmd)) {
    out('summary(goiania) — 52 semanas de 2021');
    out(`${pad('', 22)}${pad('Min', 14)}${pad('Média', 14)}Max`);
    const stat = (nome: string, sel: (r: (typeof g)[number]) => number) => {
      const vals = g.map(sel);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      out(`${pad(nome, 22)}${pad(fmt(min), 14)}${pad(fmt(Math.round(mean)), 14)}${fmt(max)}`);
    };
    stat('casos_acumulados', (r) => r.casosAcumulados);
    stat('casos_novos', (r) => r.casosNovos);
    stat('obitos_acumulados', (r) => r.obitosAcumulados);
    stat('obitos_novos', (r) => r.obitosNovos);
  } else if (/^max\(goiania\$casos_acumulados\)$/.test(cmd)) ok(`[1] ${fmt(summaryStats.goiania.casosAcumulados)}`);
  else if (/^max\(goiania\$obitos_acumulados\)$/.test(cmd)) ok(`[1] ${fmt(summaryStats.goiania.obitosAcumulados)}`);
  else if (/^sum\(goiania\$casos_novos\)$/.test(cmd)) ok(`[1] ${fmt(summaryStats.goiania.casosNovos)}`);
  else if (/^sum\(goiania\$obitos_novos\)$/.test(cmd)) ok(`[1] ${fmt(summaryStats.goiania.obitosNovos)}`);
  else if (/^nrow\(goiania\)$/.test(cmd)) ok(`[1] ${g.length}`);
  else if (/^names\(goiania\)$/.test(cmd)) out('[1] "semana" "casos_acumulados" "casos_novos" "obitos_acumulados" "obitos_novos"');
  else if (/^table\(metro_interior\)$/.test(cmd)) {
    out('table(metro_interior)');
    metroInteriorData.forEach((m) => out(`${pad(m.grupo, 24)}${fmt(m.casosAcumulados)}`));
  } else if (/^group_by\(regiao\)$/.test(cmd)) {
    out('group_by(regiao) — totais por região');
    out(`${pad('regiao', 16)}${pad('casos', 12)}${pad('obitos', 12)}municipios`);
    const regioes = municipioData.reduce<Record<string, { casos: number; obitos: number; municipios: Set<string> }>>(
      (acc, m) => {
        acc[m.regiao] ??= { casos: 0, obitos: 0, municipios: new Set() };
        acc[m.regiao].casos += m.casosAcumulados;
        acc[m.regiao].obitos += m.obitosAcumulados;
        acc[m.regiao].municipios.add(`${m.uf}|${m.municipio}`);
        return acc;
      },
      {},
    );
    REGIOES.forEach((reg) => {
      const d = regioes[reg];
      if (d) out(`${pad(reg, 16)}${pad(fmt(d.casos), 12)}${pad(fmt(d.obitos), 12)}${d.municipios.size}`);
    });
  } else if (/^top\(uf\)$/.test(cmd)) {
    out('top(uf) — 5 UFs com mais casos');
    out(`${pad('uf', 6)}${pad('regiao', 14)}${pad('casos', 12)}obitos`);
    [...ufData]
      .sort((a, b) => b.casosAcumulados - a.casosAcumulados)
      .slice(0, 5)
      .forEach((u) => out(`${pad(u.uf, 6)}${pad(u.regiao, 14)}${pad(fmt(u.casosAcumulados), 12)}${fmt(u.obitosAcumulados)}`));
  } else if (/^top_municipios\((\d+)\)$/.test(cmd)) {
    const n = Math.min(Number(cmd.match(/^top_municipios\((\d+)\)$/)?.[1]), 20);
    out(`top_municipios(${n}) — municípios com mais casos`);
    out(`${pad('municipio', 28)}${pad('uf', 4)}${pad('casos', 12)}obitos`);
    [...municipioData]
      .sort((a, b) => b.casosAcumulados - a.casosAcumulados)
      .slice(0, n)
      .forEach((m) => out(`${pad(m.municipio, 28)}${pad(m.uf, 4)}${pad(fmt(m.casosAcumulados), 12)}${fmt(m.obitosAcumulados)}`));
  } else if (/^filter\(goiania,\s*semana\s*==\s*(\d+)\)$/.test(cmd)) {
    const semana = Number(cmd.match(/^filter\(goiania,\s*semana\s*==\s*(\d+)\)$/)?.[1]);
    const row = g.find((r) => r.semana === semana);
    if (row) tabelaSemanas([row], `filter(goiania, semana == ${semana})`);
    else linhas.push({ type: 'error', text: `✗ Semana ${semana} fora do intervalo 1-52.` });
  } else if (/^serie\(nacional\)$/.test(cmd)) {
    out('serie(nacional) — casos acumulados por semana');
    out(seriesNacional.map((s) => `${s.semana}:${fmt(s.casosAcumulados)}`).join(' '));
  } else if (/^(help|ajuda)\(\)$/.test(cmd)) {
    out('Comandos R disponíveis (todos calculados dos dados reais):');
    out('  head(goiania) · tail(goiania) · summary(goiania)');
    out('  max(goiania$casos_acumulados) · max(goiania$obitos_acumulados)');
    out('  sum(goiania$casos_novos) · sum(goiania$obitos_novos)');
    out('  nrow(goiania) · names(goiania) · table(metro_interior)');
    out('  group_by(regiao) · top(uf) · top_municipios(N)');
    out('  filter(goiania, semana == N) · serie(nacional)');
    out('  limpar ou clear para limpar a tela');
  } else {
    linhas.push({ type: 'error', text: `✗ Comando R não reconhecido: ${cmd}. Digite ajuda() para ver os comandos.` });
  }
  return linhas;
};

export const executarDados = (cmd: string): Line[] => {
  const linhas: Line[] = [];
  const out = (t: string) => linhas.push({ type: 'output', text: t });
  const ok = (t: string) => linhas.push({ type: 'success', text: t });

  if (/^(goiania|resumo goiania)$/.test(cmd)) {
    out('Goiânia (GO) — COVID-19 em 2021');
    ok(`  Casos acumulados  : ${fmt(summaryStats.goiania.casosAcumulados)}`);
    ok(`  Óbitos acumulados : ${fmt(summaryStats.goiania.obitosAcumulados)}`);
    ok(`  Casos novos       : ${fmt(summaryStats.goiania.casosNovos)}`);
    ok(`  Óbitos novos      : ${fmt(summaryStats.goiania.obitosNovos)}`);
    out(`  52 semanas epidemiológicas (1-52)`);
  } else if (/^resumo$/.test(cmd)) {
    out('Base nacional — COVID-19 2021 (Ministério da Saúde)');
    ok(`  Registros brutos  : ${fmt(296_323)}`);
    ok(`  Registros limpos  : ${fmt(summaryStats.totalRegistros)}`);
    ok(`  Municípios        : ${fmt(summaryStats.totalMunicipios)}`);
    ok(`  UFs               : ${summaryStats.totalUFs}`);
    ok(`  Semanas           : ${summaryStats.goiania.semanas}`);
  } else if (/^top estados$/.test(cmd) || /^top uf$/.test(cmd)) {
    out('Top 5 UFs por casos acumulados');
    out(`${pad('uf', 6)}${pad('regiao', 14)}${pad('casos', 12)}obitos`);
    [...ufData]
      .sort((a, b) => b.casosAcumulados - a.casosAcumulados)
      .slice(0, 5)
      .forEach((u) => out(`${pad(u.uf, 6)}${pad(u.regiao, 14)}${pad(fmt(u.casosAcumulados), 12)}${fmt(u.obitosAcumulados)}`));
  } else if (/^regiao\s+(.+)$/.test(cmd)) {
    const nome = cmd.match(/^regiao\s+(.+)$/)?.[1]?.trim() ?? '';
    const reg = REGIOES.find((r) => r.toLowerCase() === nome.toLowerCase());
    if (!reg) {
      linhas.push({ type: 'error', text: `✗ Região "${nome}" não encontrada. Regiões: ${REGIOES.join(', ')}.` });
    } else {
      const dados = municipioData.filter((m) => m.regiao === reg);
      const casos = dados.reduce((a, m) => a + m.casosAcumulados, 0);
      const obitos = dados.reduce((a, m) => a + m.obitosAcumulados, 0);
      const ufs = new Set(dados.map((m) => m.uf));
      out(`${reg} — ${ufs.size} UFs, ${new Set(dados.map((m) => `${m.uf}|${m.municipio}`)).size} municípios`);
      ok(`  Casos acumulados  : ${fmt(casos)}`);
      ok(`  Óbitos acumulados : ${fmt(obitos)}`);
    }
  } else if (/^semana\s+(\d+)$/.test(cmd)) {
    const semana = Number(cmd.match(/^semana\s+(\d+)$/)?.[1]);
    const row = goianiaSeries.find((r) => r.semana === semana);
    if (!row) {
      linhas.push({ type: 'error', text: `✗ Semana ${semana} fora do intervalo 1-52.` });
    } else {
      out(`Goiânia — semana ${semana} de 2021`);
      ok(`  Casos acumulados  : ${fmt(row.casosAcumulados)}`);
      ok(`  Casos novos       : ${fmt(row.casosNovos)}`);
      ok(`  Óbitos acumulados : ${fmt(row.obitosAcumulados)}`);
      ok(`  Óbitos novos      : ${fmt(row.obitosNovos)}`);
    }
  } else if (/^metro x interior$/.test(cmd) || /^metro.?interior$/.test(cmd)) {
    out('Reg. Metropolitana × Interior (Brasil)');
    metroInteriorData.forEach((m) => {
      out(`${pad(m.grupo, 24)}${pad(fmt(m.casosAcumulados), 14)}${fmt(m.obitosAcumulados)}`);
    });
  } else if (/^(casos|obitos)$/.test(cmd)) {
    const alvo = cmd === 'casos' ? summaryStats.goiania.casosAcumulados : summaryStats.goiania.obitosAcumulados;
    ok(`[1] ${fmt(alvo)}`);
  } else if (/^ajuda$/.test(cmd) || /^help$/.test(cmd)) {
    out('Consultas disponíveis (em português):');
    out('  goiania — totais de Goiânia em 2021');
    out('  resumo — visão geral da base');
    out('  top estados — 5 UFs com mais casos');
    out('  regiao <nome> — totais de uma região');
    out('  semana <n> — dados da semana em Goiânia');
    out('  metro x interior — comparação');
    out('  casos · obitos — totais de Goiânia');
    out('  limpar ou clear para limpar a tela');
  } else {
    linhas.push({ type: 'error', text: `✗ Consulta não reconhecida: "${cmd}". Digite ajuda.` });
  }
  return linhas;
};
