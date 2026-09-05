export interface TechItem {
  name: string;
  category: string;
  detail: string;
}

export const techStack: TechItem[] = [
  { name: 'R / tidyverse', category: 'ANÁLISE', detail: 'Manipulação e análise de dados com pipes (%>%), mutate, group_by e summarise.' },
  { name: 'dplyr', category: 'LIMPEZA', detail: 'Limpeza da base: filter, distinct, rename e pmax para correção de valores negativos.' },
  { name: 'ggplot2', category: 'VISUALIZAÇÃO', detail: 'Gráficos de linha e barras empilhadas da atividade (casos e óbitos por semana).' },
  { name: 'readxl', category: 'IMPORTAÇÃO', detail: 'Leitura da base dados-covid.xlsx do Ministério da Saúde.' },
  { name: 'React', category: 'FRONTEND', detail: 'Interface interativa do dashboard, com componentes e animações.' },
  { name: 'TypeScript', category: 'TIPAGEM', detail: 'Tipos estáticos e dados exportados em src/data/covid.ts.' },
  { name: 'Vite', category: 'BUILD', detail: 'Ferramenta de build e servidor de desenvolvimento.' },
  { name: 'Vitest', category: 'TESTES', detail: 'Testes de integridade dos dados e da lógica de filtros do dashboard.' },
  { name: 'Node.js', category: 'PIPELINE', detail: 'Script scripts/export-data.mjs que gera os dados consumidos pelo site.' },
];
