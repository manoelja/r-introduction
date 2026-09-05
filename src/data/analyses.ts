export interface AnalysisResult {
  id: number;
  category: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  problem: Record<string, string>;
  result: Record<string, string>;
  tags: string[];
}

export const analysisResults: AnalysisResult[] = [
  {
    id: 1,
    category: { pt: 'ITEM 1 · IMPORTAÇÃO', en: 'ITEM 1 · IMPORT', es: 'ITEM 1 · IMPORTACIÓN' },
    title: { pt: 'Importação dos dados', en: 'Data import', es: 'Importación de datos' },
    description: {
      pt: 'Carregamento da base de casos e óbitos de COVID-19 (2021) do Ministério da Saúde com readxl.',
      en: 'Loading the COVID-19 cases and deaths dataset (2021) from the Ministry of Health with readxl.',
      es: 'Carga de la base de casos y muertes por COVID-19 (2021) del Ministerio de Salud con readxl.',
    },
    problem: {
      pt: 'Ler o arquivo dados-covid.xlsx e entender sua estrutura: 9 colunas e 296.323 registros.',
      en: 'Read the dados-covid.xlsx file and understand its structure: 9 columns and 296,323 records.',
      es: 'Leer el archivo dados-covid.xlsx y entender su estructura: 9 columnas y 296.323 registros.',
    },
    result: {
      pt: 'Base carregada com 296.323 registros e 9 colunas: UF, Município, Metro/Interior, Ano_Semana, casos e óbitos (acumulados e novos).',
      en: 'Dataset loaded with 296,323 records and 9 columns: UF, Municipality, Metro/Interior, Ano_Semana, cases and deaths (cumulative and new).',
      es: 'Base cargada con 296.323 registros y 9 columnas: UF, Municipio, Metro/Interior, Ano_Semana, casos y muertes (acumuladas y nuevas).',
    },
    tags: ['readxl', 'importação'],
  },
  {
    id: 2,
    category: { pt: 'ITEM 2 · LIMPEZA', en: 'ITEM 2 · CLEANING', es: 'ITEM 2 · LIMPIEZA' },
    title: { pt: 'Limpeza dos dados', en: 'Data cleaning', es: 'Limpieza de datos' },
    description: {
      pt: 'Padronização de colunas, remoção de registros sem município, correção de negativos e remoção de duplicatas com dplyr.',
      en: 'Column standardization, removal of records without municipality, correction of negatives and removal of duplicates with dplyr.',
      es: 'Estandarización de columnas, eliminación de registros sin municipio, corrección de negativos y eliminación de duplicados con dplyr.',
    },
    problem: {
      pt: 'Dados brutos com registros agregados por UF sem município, semana 53 fora do calendário e valores negativos de casos novos.',
      en: 'Raw data with UF-level records without municipality, week 53 outside the calendar and negative new-case values.',
      es: 'Datos brutos con registros agregados por UF sin municipio, semana 53 fuera del calendario y valores negativos de casos nuevos.',
    },
    result: {
      pt: '6.683 registros removidos (1.113 sem município + 5.570 da semana 53), 4 valores negativos corrigidos e 289.640 registros finais.',
      en: '6,683 records removed (1,113 without municipality + 5,570 from week 53), 4 negative values corrected and 289,640 final records.',
      es: '6.683 registros eliminados (1.113 sin municipio + 5.570 de la semana 53), 4 valores negativos corregidos y 289.640 registros finales.',
    },
    tags: ['dplyr', 'qualidade'],
  },
  {
    id: 3,
    category: { pt: 'ITEM 3 · CATEGORIZAÇÃO', en: 'ITEM 3 · FACTOR', es: 'ITEM 3 · CATEGORIZACIÓN' },
    title: { pt: 'Categorização Metro/Interior', en: 'Metro/Interior factor', es: 'Factor Metro/Interior' },
    description: {
      pt: 'Transformação da coluna Metro/Interior em fator com a função factor() do R.',
      en: 'Converting the Metro/Interior column into a factor using the factor() function in R.',
      es: 'Conversión de la columna Metro/Interior en factor con la función factor() de R.',
    },
    problem: {
      pt: 'Tratar a variável categórica Metro/Interior como texto em vez de fator com níveis definidos.',
      en: 'Treating the categorical Metro/Interior variable as text instead of a factor with defined levels.',
      es: 'Tratar la variable categórica Metro/Interior como texto en lugar de un factor con niveles definidos.',
    },
    result: {
      pt: 'Variável categorizada com 2 níveis: Reg. Metropolitana (20.072 registros) e Interior (269.568).',
      en: 'Variable categorized with 2 levels: Reg. Metropolitana (20,072 records) and Interior (269,568).',
      es: 'Variable categorizada con 2 niveles: Reg. Metropolitana (20.072 registros) e Interior (269.568).',
    },
    tags: ['factor()', 'fatores'],
  },
  {
    id: 4,
    category: { pt: 'ITEM 4 · RESUMO', en: 'ITEM 4 · SUMMARY', es: 'ITEM 4 · RESUMEN' },
    title: { pt: 'Resumo dos dados', en: 'Data summary', es: 'Resumen de datos' },
    description: {
      pt: 'Visão geral estatística da base com a função summary() do R.',
      en: 'Statistical overview of the dataset with the summary() function in R.',
      es: 'Visión general estadística de la base con la función summary() de R.',
    },
    problem: {
      pt: 'Entender a distribuição de casos e óbitos em todo o território nacional.',
      en: 'Understand the distribution of cases and deaths across the country.',
      es: 'Entender la distribución de casos y muertes en todo el territorio nacional.',
    },
    result: {
      pt: 'Resumo de todas as colunas com mínimo, máximo e média das variáveis numéricas, além das contagens das categóricas.',
      en: 'Summary of all columns with min, max and mean of numeric variables, plus counts of categorical ones.',
      es: 'Resumen de todas las columnas con mínimo, máximo y media de las variables numéricas, además de los conteos de las categóricas.',
    },
    tags: ['summary()', 'EDA'],
  },
  {
    id: 5,
    category: { pt: 'ITEM 5 · FILTRO', en: 'ITEM 5 · FILTER', es: 'ITEM 5 · FILTRO' },
    title: { pt: 'Filtro Goiânia', en: 'Goiânia filter', es: 'Filtro Goiânia' },
    description: {
      pt: 'Filtro da base para a cidade de Goiânia (GO) e exibição das 10 primeiras linhas.',
      en: 'Filtering the dataset to Goiânia (GO) and showing the first 10 rows.',
      es: 'Filtro de la base para la ciudad de Goiânia (GO) y visualización de las 10 primeras filas.',
    },
    problem: {
      pt: 'Isolar os dados do município de Goiânia para análise detalhada.',
      en: 'Isolate Goiânia data for detailed analysis.',
      es: 'Aislar los datos del municipio de Goiânia para un análisis detallado.',
    },
    result: {
      pt: '52 semanas epidemiológicas de 2021 para Goiânia, com casos e óbitos por semana.',
      en: '52 epidemiological weeks of 2021 for Goiânia, with weekly cases and deaths.',
      es: '52 semanas epidemiológicas de 2021 para Goiânia, con casos y muertes por semana.',
    },
    tags: ['filter()', 'Goiânia'],
  },
  {
    id: 6,
    category: { pt: 'ITEM 6 · TOTAIS', en: 'ITEM 6 · TOTALS', es: 'ITEM 6 · TOTALES' },
    title: { pt: 'Casos e óbitos acumulados', en: 'Cumulative cases and deaths', es: 'Casos y muertes acumuladas' },
    description: {
      pt: 'Cálculo dos totais acumulados e novos de casos e óbitos de COVID-19 em Goiânia em 2021.',
      en: 'Computing cumulative and new totals of COVID-19 cases and deaths in Goiânia in 2021.',
      es: 'Cálculo de los totales acumulados y nuevos de casos y muertes por COVID-19 en Goiânia en 2021.',
    },
    problem: {
      pt: 'Responder: quantos casos e óbitos Goiânia registrou no ano de 2021?',
      en: 'Answer: how many cases and deaths did Goiânia record in 2021?',
      es: 'Responder: ¿cuántos casos y muertes registró Goiânia en 2021?',
    },
    result: {
      pt: '216.065 casos acumulados · 6.991 óbitos acumulados · 42.422 casos novos · 1.850 óbitos novos.',
      en: '216,065 cumulative cases · 6,991 cumulative deaths · 42,422 new cases · 1,850 new deaths.',
      es: '216.065 casos acumulados · 6.991 muertes acumuladas · 42.422 casos nuevos · 1.850 muertes nuevas.',
    },
    tags: ['max()', 'sum()'],
  },
  {
    id: 7,
    category: { pt: 'ITEM 7 · GRÁFICO', en: 'ITEM 7 · CHART', es: 'ITEM 7 · GRÁFICO' },
    title: { pt: 'Linha de casos acumulados', en: 'Cumulative cases line', es: 'Línea de casos acumulados' },
    description: {
      pt: 'Gráfico de linha dos casos acumulados de COVID-19 por semana em Goiânia (2021) com ggplot2.',
      en: 'Line chart of cumulative COVID-19 cases per week in Goiânia (2021) with ggplot2.',
      es: 'Gráfico de línea de los casos acumulados de COVID-19 por semana en Goiânia (2021) con ggplot2.',
    },
    problem: {
      pt: 'Visualizar a evolução dos casos ao longo das 52 semanas do ano.',
      en: 'Visualize how cases evolved over the 52 weeks of the year.',
      es: 'Visualizar la evolución de los casos a lo largo de las 52 semanas del año.',
    },
    result: {
      pt: 'Curva ascendente com picos ao longo do ano; o gráfico está no dashboard (aba Série semanal).',
      en: 'Upward curve with peaks throughout the year; the chart is in the dashboard (Weekly series tab).',
      es: 'Curva ascendente con picos durante el año; el gráfico está en el panel (pestaña Serie semanal).',
    },
    tags: ['ggplot2', 'linha'],
  },
  {
    id: 8,
    category: { pt: 'ITEM 8 · GRÁFICO', en: 'ITEM 8 · CHART', es: 'ITEM 8 · GRÁFICO' },
    title: { pt: 'Linha de óbitos acumulados', en: 'Cumulative deaths line', es: 'Línea de muertes acumuladas' },
    description: {
      pt: 'Gráfico de linha dos óbitos acumulados por semana em Goiânia (2021) com ggplot2.',
      en: 'Line chart of cumulative deaths per week in Goiânia (2021) with ggplot2.',
      es: 'Gráfico de línea de las muertes acumuladas por semana en Goiânia (2021) con ggplot2.',
    },
    problem: {
      pt: 'Visualizar a evolução dos óbitos e identificar os momentos críticos.',
      en: 'Visualize how deaths evolved and identify critical moments.',
      es: 'Visualizar la evolución de las muertes e identificar los momentos críticos.',
    },
    result: {
      pt: 'Curva de óbitos com crescimento contínuo; gráfico disponível no dashboard.',
      en: 'Deaths curve with continuous growth; chart available in the dashboard.',
      es: 'Curva de muertes con crecimiento continuo; gráfico disponible en el panel.',
    },
    tags: ['ggplot2', 'linha'],
  },
  {
    id: 9,
    category: { pt: 'ITEM 9 · DERIVAÇÃO', en: 'ITEM 9 · DERIVATION', es: 'ITEM 9 · DERIVACIÓN' },
    title: { pt: 'Coluna Regiao', en: 'Regiao column', es: 'Columna Regiao' },
    description: {
      pt: 'Criação da coluna Regiao a partir da UF, agrupando os estados nas 5 regiões do Brasil.',
      en: 'Creating the Regiao column from UF, grouping states into Brazil\'s 5 regions.',
      es: 'Creación de la columna Regiao a partir de la UF, agrupando los estados en las 5 regiones de Brasil.',
    },
    problem: {
      pt: 'Agregar as 27 UFs em blocos regionais para permitir comparação entre regiões.',
      en: 'Group the 27 states into regional blocks to allow comparisons between regions.',
      es: 'Agrupar las 27 UFs en bloques regionales para permitir la comparación entre regiones.',
    },
    result: {
      pt: 'Coluna regiao criada com recode(): Norte, Nordeste, Centro-Oeste, Sul e Sudeste.',
      en: 'regiao column created with recode(): North, Northeast, Central-West, South and Southeast.',
      es: 'Columna regiao creada con recode(): Norte, Nordeste, Centro-Oeste, Sul y Sudeste.',
    },
    tags: ['recode()', 'regiões'],
  },
  {
    id: 10,
    category: { pt: 'ITEM 10 · GRÁFICO', en: 'ITEM 10 · CHART', es: 'ITEM 10 · GRÁFICO' },
    title: { pt: 'Barras empilhadas por região', en: 'Stacked bars by region', es: 'Barras apiladas por región' },
    description: {
      pt: 'Gráfico de barras empilhadas dos óbitos acumulados por semana, empilhados por região.',
      en: 'Stacked bar chart of cumulative deaths per week, stacked by region.',
      es: 'Gráfico de barras apiladas de las muertes acumuladas por semana, apiladas por región.',
    },
    problem: {
      pt: 'Comparar o peso de cada região nos óbitos ao longo do ano.',
      en: 'Compare the share of each region in deaths throughout the year.',
      es: 'Comparar el peso de cada región en las muertes a lo largo del año.',
    },
    result: {
      pt: 'Sudeste e Nordeste concentram a maior parte dos óbitos; gráfico no dashboard (Série semanal → Empilhado).',
      en: 'Southeast and Northeast concentrate most deaths; chart in the dashboard (Weekly series → Stacked).',
      es: 'Sudeste y Nordeste concentran la mayor parte de las muertes; gráfico en el panel (Serie semanal → Apilado).',
    },
    tags: ['ggplot2', 'empilhado'],
  },
];
