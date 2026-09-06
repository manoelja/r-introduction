import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Filter, BarChart3, Table2, TrendingUp, LayoutGrid, Layers, GitCompare, CircleDot,
  MapPin, Globe, Building2, X, ArrowLeft, Lightbulb, TrendingDown, AlertTriangle,
  CheckCircle, Activity, HeartPulse, Biohazard, Skull, LineChart, AlertCircle,
} from 'lucide-react';
import { summaryStats, REGIOES, ufData } from '../../data/covid';
import {
  buildComparativo,
  buildSerieSemanal,
  filtrosVazios,
  metricLabels,
  regionColors,
  METRICS,
  METRO_INTERIOR_OPCOES,
  type Filtros,
  type Metric,
  type Nivel,
  type EscopoSerie,
  type ChartRow,
} from './aggregate';
import { Chart, SerieLine, SerieStacked, type ChartType } from './charts';
import './Dashboard.css';

const metricColorsDark: Record<Metric, string> = {
  casosAcumulados: '#06b6d4',
  casosNovos: '#22d3ee',
  obitosAcumulados: '#f87171',
  obitosNovos: '#fbbf24',
};

const metricColorsLight: Record<Metric, string> = {
  casosAcumulados: '#0891b2',
  casosNovos: '#0284c7',
  obitosAcumulados: '#dc2626',
  obitosNovos: '#d97706',
};

interface TooltipState {
  x: number;
  y: number;
  content: string;
  color?: string;
  kind?: 'chart-blocked';
}

// ---- Filtros primários com sub-filtros (padrão do dashboard de referência) ----
type FiltroPrimario = 'regiao' | 'uf' | 'metroInterior';

const FILTRO_KEYS: Record<FiltroPrimario, keyof Filtros> = {
  regiao: 'regioes',
  uf: 'ufs',
  metroInterior: 'metroInterior',
};

const TODAS_UFS = ufData.map((u) => u.uf);

// Mapa UF → região (usado para restringir as UFs às regiões selecionadas)
const REGIAO_DA_UF: Record<string, string> = Object.fromEntries(ufData.map((u) => [u.uf, u.regiao]));

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

  const [isLight, setIsLight] = useState(document.documentElement.classList.contains('light-theme'));
  const [tab, setTab] = useState<'comparativo' | 'serie'>('comparativo');
  const [filtros, setFiltros] = useState<Filtros>(filtrosVazios);
  const [activeFilters, setActiveFilters] = useState<FiltroPrimario[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>(['casosAcumulados']);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [drillRegion, setDrillRegion] = useState<string | null>(null);
  const [drillUF, setDrillUF] = useState<string | null>(null);

  const [escopo, setEscopo] = useState<EscopoSerie | null>(null);
  const [serieMetrica, setSerieMetrica] = useState<Metric>('casosAcumulados');
  const [serieTipo, setSerieTipo] = useState<'linha' | 'empilhado'>('linha');
  const [serieRegioes, setSerieRegioes] = useState<string[]>([]);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light-theme'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const colors = isLight ? metricColorsLight : metricColorsDark;

  // Cores das séries semanais: regiões têm cor fixa; escopos únicos
  // (Goiânia, Brasil) usam o verde do tema — mais escuro no modo escuro
  // e mais claro no modo claro, para os pontinhos sempre aparecerem.
  const serieColors = useMemo<Record<string, string>>(
    () => ({
      ...regionColors,
      default: isLight ? '#67e8f9' : '#06b6d4',
    }),
    [isLight],
  );

  // Nível de agrupamento: o drill vai mais fundo; com filtros primários abertos,
  // o eixo segue a prioridade da referência (Região > UF > Metro/Interior) — abrir
  // um filtro já mostra todas as opções daquela dimensão como padrão (ex.: abrir
  // UF mostra as 27 UFs; abrir Metro/Interior mostra as 2 categorias).
  const nivel: Nivel = drillUF
    ? 'municipio'
    : drillRegion
      ? 'uf'
      : activeFilters.includes('regiao') || filtros.regioes.length > 0
        ? 'regiao'
        : activeFilters.includes('uf') || filtros.ufs.length > 0
          ? 'uf'
          : activeFilters.includes('metroInterior') || filtros.metroInterior.length > 0
            ? 'metroInterior'
            : 'regiao';

  const hasFiltros = filtros.regioes.length > 0 || filtros.ufs.length > 0 || filtros.metroInterior.length > 0;

  // Empty state: sem filtros primários abertos e sem drill-down → mensagem padrão
  // orientativa (padrão do dashboard de referência: abrir o filtro já mostra todas
  // as regiões, pois buildComparativo trata lista vazia como "todas")
  const showEmptyState = activeFilters.length === 0 && drillRegion === null && drillUF === null;

  // Sub-filtro de UF dependente da região: se há regiões selecionadas, só
  // exibe (e permite selecionar) os estados que pertencem a essas regiões
  const ufsDisponiveis = useMemo(() => {
    if (filtros.regioes.length === 0) return TODAS_UFS;
    return TODAS_UFS.filter((uf) => filtros.regioes.includes(REGIAO_DA_UF[uf]));
  }, [filtros.regioes]);
  const temDrill = drillRegion !== null || drillUF !== null;

  const rows = useMemo(
    () => buildComparativo(filtros, nivel, drillRegion, drillUF),
    [filtros, nivel, drillRegion, drillUF],
  );

  const MAX_ROWS = 60;
  const displayRows = useMemo(() => {
    if (rows.length <= MAX_ROWS) return rows;
    const m = metrics[0];
    return [...rows].sort((a, b) => b.values[m] - a.values[m]).slice(0, MAX_ROWS);
  }, [rows, metrics]);
  const capped = rows.length > MAX_ROWS;

  // Muitos grupos (ex.: todas as UFs ou municípios) → valores abreviados (100k)
  const compactValues = displayRows.length > 12;

  const maxVal = useMemo(() => {
    let max = 1;
    for (const row of displayRows) {
      for (const m of metrics) {
        if (row.values[m] > max) max = row.values[m];
      }
    }
    return max;
  }, [displayRows, metrics]);

  const series = useMemo(
    () => (escopo ? buildSerieSemanal(escopo, serieRegioes, serieMetrica) : []),
    [escopo, serieRegioes, serieMetrica],
  );

  const toggleFiltro = (chave: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const atual = prev[chave];
      const novo = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
      // Ao mudar regiões, remove UFs que ficaram fora das regiões selecionadas
      if (chave === 'regioes') {
        const ufs = novo.length === 0 ? prev.ufs : prev.ufs.filter((uf) => novo.includes(REGIAO_DA_UF[uf]));
        return { ...prev, regioes: novo, ufs };
      }
      return { ...prev, [chave]: novo };
    });
  };

  // Ativa/desativa um filtro primário (abre o sub-filtro com as opções)
  const toggleFiltroPrimario = (f: FiltroPrimario) => {
    const fechando = activeFilters.includes(f);
    if (fechando) {
      // Ao fechar, limpa os valores escolhidos daquele filtro
      setFiltros((p) => ({ ...p, [FILTRO_KEYS[f]]: [] }));
      setActiveFilters((prev) => prev.filter((x) => x !== f));
    } else {
      setActiveFilters((prev) => [...prev, f]);
    }
  };

  const resetFiltros = () => {
    setFiltros(filtrosVazios);
    setActiveFilters([]);
    setDrillRegion(null);
    setDrillUF(null);
  };

  // Série semanal: sem escopo selecionado (ou escopo Regiões sem regiões)
  // → mensagem padrão, como na aba Comparativo
  const serieVazia = escopo === null || (escopo === 'regioes' && serieRegioes.length === 0);

  const resetSerie = () => {
    setEscopo(null);
    setSerieRegioes([]);
    setSerieMetrica('casosAcumulados');
    setSerieTipo('linha');
  };

  const toggleMetric = (m: Metric) => {
    setMetrics((prev) => {
      // Mantém a ordem canônica de METRICS independente da ordem de clique,
      // para que legenda, tabela e donut sempre mostrem os nomes na mesma ordem
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      if (next.length === 0) return prev;
      return METRICS.filter((x) => next.includes(x));
    });
  };

  // ---- Validação gráfico × métrica (como o dashboard de referência) ----
  // Alguns tipos só fazem sentido com uma única métrica (bar, horizontal, donut).
  // Com múltiplas métricas, restringe aos tipos que as suportam e, se o tipo
  // atual ficar inválido, troca automaticamente para "grouped".
  const multiMetric = metrics.length > 1;

  const validChartTypes: Record<'true' | 'false', ChartType[]> = {
    false: ['bar', 'horizontal', 'grouped', 'stacked', 'line', 'donut', 'table'],
    true: ['grouped', 'stacked', 'line', 'table'],
  };

  const autoChart: ChartType = multiMetric
    ? validChartTypes['true'].includes(chartType)
      ? chartType
      : 'grouped'
    : chartType;

  const onDrill = (row: ChartRow) => {
    if (nivel === 'regiao') setDrillRegion(row.label);
    else if (nivel === 'uf') setDrillUF(row.label);
  };

  const getChartTitle = () => {
    if (nivel === 'municipio') return `${drillUF} — Municípios`;
    if (nivel === 'uf') {
      if (drillRegion) return `${drillRegion} — UFs`;
      if (filtros.ufs.length > 0) return t('dashboard.ufs_selecionadas');
      return t('dashboard.ufs');
    }
    if (nivel === 'metroInterior') return t('dashboard.metro_interior');
    if (hasFiltros) return t('dashboard.regioes_selecionadas');
    return t('dashboard.brasil_por_regiao');
  };

  const handleHover = (e: React.MouseEvent, content: string, color?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 10, content, color });
  };

  const insights = useMemo(() => {
    const result: { type: 'high' | 'low' | 'info' | 'warning'; text: string }[] = [];
    if (rows.length === 0) return result;
    const m = metrics[0];
    const label = metricLabels[m][(lang as 'pt' | 'en' | 'es')] || metricLabels[m].pt;
    const values = rows.map((r) => ({ label: r.label, value: r.values[m] }));
    const max = values.reduce((a, b) => (a.value > b.value ? a : b));
    const min = values.length > 1 ? values.reduce((a, b) => (a.value < b.value ? a : b)) : null;

    result.push({ type: 'high', text: `${max.label} lidera com ${max.value.toLocaleString('pt-BR')} ${label}.` });
    if (min) result.push({ type: 'low', text: `${min.label} apresenta o menor valor: ${min.value.toLocaleString('pt-BR')}.` });
    if (values.length > 1 && min) {
      const diffPct = ((max.value / min.value - 1) * 100).toFixed(1);
      result.push({ type: 'info', text: `${max.label} é ${diffPct}% maior que ${min.label}.` });
    }
    if (nivel === 'regiao' && !hasFiltros) {
      const sudeste = rows.find((r) => r.label === 'Sudeste');
      const norte = rows.find((r) => r.label === 'Norte');
      if (sudeste && norte && norte.values[m] > 0) {
        result.push({
          type: 'warning',
          text: `Sudeste concentra ${((sudeste.values[m] / rows.reduce((a, r) => a + r.values[m], 0)) * 100).toFixed(0)}% dos ${label} do país.`,
        });
      }
    }
    if (nivel === 'municipio' && drillUF === 'GO') {
      const goiania = rows.find((r) => r.label === 'Goiânia');
      if (goiania) {
        result.push({ type: 'info', text: `Goiânia concentra ${((goiania.values[m] / rows.reduce((a, r) => a + r.values[m], 0)) * 100).toFixed(0)}% dos ${label} de Goiás.` });
      }
    }
    if (filtros.metroInterior.length === 2) {
      const metro = rows.filter((r) => r.group === 'Município');
      void metro;
      result.push({ type: 'info', text: 'Comparando Região Metropolitana e Interior de Goiás.' });
    }
    return result;
  }, [rows, metrics, nivel, hasFiltros, drillUF, filtros.metroInterior.length, lang]);

  const ml = (m: Metric) => metricLabels[m][(lang as 'pt' | 'en' | 'es')] || metricLabels[m].pt;

  return (
    <section id="dashboard" className="dashboard">
      <div className="container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('dashboard.title')}
        </motion.h2>

        {/* ============ CARDS DE RESUMO (Item 6) ============ */}
        <motion.div
          className="summary-grid"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="summary-card cyber-card">
            <div className="summary-icon" style={{ background: 'var(--accent-soft)' }}>
              <Biohazard size={20} />
            </div>
            <span className="summary-label">{t('dashboard.casos_acumulados')}</span>
            <span className="summary-value">{summaryStats.goiania.casosAcumulados.toLocaleString('pt-BR')}</span>
            <span className="summary-hint">{t('dashboard.goiania_2021')}</span>
          </div>
          <div className="summary-card cyber-card">
            <div className="summary-icon" style={{ background: 'var(--lavender-soft)' }}>
              <Skull size={20} />
            </div>
            <span className="summary-label">{t('dashboard.obitos_acumulados')}</span>
            <span className="summary-value">{summaryStats.goiania.obitosAcumulados.toLocaleString('pt-BR')}</span>
            <span className="summary-hint">{t('dashboard.goiania_2021')}</span>
          </div>
          <div className="summary-card cyber-card">
            <div className="summary-icon" style={{ background: 'var(--accent-soft)' }}>
              <HeartPulse size={20} />
            </div>
            <span className="summary-label">{t('dashboard.casos_novos')}</span>
            <span className="summary-value">{summaryStats.goiania.casosNovos.toLocaleString('pt-BR')}</span>
            <span className="summary-hint">{t('dashboard.soma_52_semanas')}</span>
          </div>
          <div className="summary-card cyber-card">
            <div className="summary-icon" style={{ background: 'var(--lavender-soft)' }}>
              <Activity size={20} />
            </div>
            <span className="summary-label">{t('dashboard.obitos_novos')}</span>
            <span className="summary-value">{summaryStats.goiania.obitosNovos.toLocaleString('pt-BR')}</span>
            <span className="summary-hint">{t('dashboard.soma_52_semanas')}</span>
          </div>
        </motion.div>

        {/* ============ TABS ============ */}
        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${tab === 'comparativo' ? 'active' : ''}`} onClick={() => setTab('comparativo')}>
            <BarChart3 size={16} />
            {t('dashboard.tab_comparativo')}
          </button>
          <button className={`dashboard-tab ${tab === 'serie' ? 'active' : ''}`} onClick={() => setTab('serie')}>
            <LineChart size={16} />
            {t('dashboard.tab_serie')}
          </button>
        </div>

        {/* ============ ABA COMPARATIVO ============ */}
        {tab === 'comparativo' && (
          <>
            <motion.div className="dashboard-controls cyber-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="controls-header">
                <Filter size={16} />
                <span className="card-label">{t('dashboard.filters')}</span>
                {(hasFiltros || temDrill || activeFilters.length > 0) && (
                  <button className="filter-reset-btn" onClick={resetFiltros}>
                    <X size={14} />
                    {t('dashboard.clear')}
                  </button>
                )}
              </div>

              <div className="primary-filters">
                <div className="primary-filter-buttons">
                  <button
                    className={`primary-filter-btn ${activeFilters.includes('regiao') ? 'active' : ''}`}
                    onClick={() => toggleFiltroPrimario('regiao')}
                  >
                    <MapPin size={14} />
                    <span>{t('dashboard.regiao')}</span>
                    {filtros.regioes.length > 0 && <span className="filter-count">{filtros.regioes.length}</span>}
                  </button>
                  <button
                    className={`primary-filter-btn ${activeFilters.includes('uf') ? 'active' : ''}`}
                    onClick={() => toggleFiltroPrimario('uf')}
                  >
                    <Globe size={14} />
                    <span>{t('dashboard.uf')}</span>
                    {filtros.ufs.length > 0 && <span className="filter-count">{filtros.ufs.length}</span>}
                  </button>
                  <button
                    className={`primary-filter-btn ${activeFilters.includes('metroInterior') ? 'active' : ''}`}
                    onClick={() => toggleFiltroPrimario('metroInterior')}
                  >
                    <Building2 size={14} />
                    <span>{t('dashboard.metro_interior')}</span>
                    {filtros.metroInterior.length > 0 && <span className="filter-count">{filtros.metroInterior.length}</span>}
                  </button>
                </div>
              </div>

              {/* Sub-filtros: cada filtro primário ativo abre um painel de seleção */}
              {activeFilters.includes('regiao') && (
                <motion.div
                  className="secondary-filters"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="control-label">{t('dashboard.regiao')}</span>
                  <div className="control-buttons secondary-btns">
                    {REGIOES.map((reg) => (
                      <button
                        key={reg}
                        className={`control-btn ${filtros.regioes.includes(reg) ? 'active' : ''}`}
                        onClick={() => toggleFiltro('regioes', reg)}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeFilters.includes('uf') && (
                <motion.div
                  className="secondary-filters"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="control-label">
                    {t('dashboard.uf')}
                    {filtros.regioes.length > 0 && (
                      <span className="control-hint">
                        {t('dashboard.uf_dependente_regiao', { regioes: filtros.regioes.join(', ') })}
                      </span>
                    )}
                  </span>
                  <div className="control-buttons secondary-btns uf-btns">
                    {ufsDisponiveis.map((uf) => (
                      <button
                        key={uf}
                        className={`control-btn ${filtros.ufs.includes(uf) ? 'active' : ''}`}
                        onClick={() => toggleFiltro('ufs', uf)}
                      >
                        {uf}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeFilters.includes('metroInterior') && (
                <motion.div
                  className="secondary-filters"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="control-label">{t('dashboard.metro_interior')}</span>
                  <div className="control-buttons secondary-btns">
                    {METRO_INTERIOR_OPCOES.map((op) => (
                      <button
                        key={op}
                        className={`control-btn ${filtros.metroInterior.includes(op) ? 'active' : ''}`}
                        onClick={() => toggleFiltro('metroInterior', op)}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="controls-grid">
                <div className="control-group">
                  <span className="control-label">{t('dashboard.metric')} <span className="hint">(multi)</span></span>
                  <div className="control-buttons">
                    {METRICS.map((m) => (
                      <button key={m} className={`control-btn ${metrics.includes(m) ? 'active' : ''}`} onClick={() => toggleMetric(m)}>
                        <span className="metric-dot" style={{ background: colors[m] }} />
                        {ml(m)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">{t('dashboard.chart')}</span>
                  <div className="control-buttons chart-type-btns">
                    {[
                      { type: 'bar' as ChartType, icon: <BarChart3 size={15} /> },
                      { type: 'horizontal' as ChartType, icon: <TrendingUp size={15} /> },
                      { type: 'grouped' as ChartType, icon: <LayoutGrid size={15} /> },
                      { type: 'stacked' as ChartType, icon: <Layers size={15} /> },
                      { type: 'line' as ChartType, icon: <GitCompare size={15} /> },
                      { type: 'donut' as ChartType, icon: <CircleDot size={15} /> },
                      { type: 'table' as ChartType, icon: <Table2 size={15} /> },
                    ].map((c) => {
                      const isBlocked = multiMetric && !validChartTypes['true'].includes(c.type);
                      return (
                        <button
                          key={c.type}
                          className={`control-btn chart-btn ${autoChart === c.type ? 'active' : ''} ${isBlocked ? 'blocked' : ''}`}
                          onClick={() => setChartType(c.type)}
                          onMouseEnter={(e) =>
                            isBlocked &&
                            setTooltip({
                              x: e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2,
                              y: e.currentTarget.getBoundingClientRect().top - 10,
                              content: t('dashboard.chart_blocked_hint'),
                              color: 'var(--warning)',
                              kind: 'chart-blocked',
                            })
                          }
                          onMouseLeave={() => isBlocked && setTooltip(null)}
                          aria-label={c.type}
                        >
                          {c.icon}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Área do gráfico */}
            <motion.div className="dashboard-chart-wrapper cyber-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              {showEmptyState ? (
                <div className="empty-state">
                  <AlertCircle size={48} className="empty-icon" />
                  <h3 className="empty-title">{t('dashboard.empty_title')}</h3>
                  <p className="empty-description">{t('dashboard.empty_description')}</p>
                </div>
              ) : (
                <>
                  <div className="chart-header">
                    <div className="chart-title-wrap">
                      <span className="chart-title">{getChartTitle()}</span>
                      {(temDrill) && (
                        <button
                          className="drill-back-btn"
                          onClick={() => {
                            if (drillUF) setDrillUF(null);
                            else if (drillRegion) setDrillRegion(null);
                          }}
                        >
                          <ArrowLeft size={12} /> {t('dashboard.back')}
                        </button>
                      )}
                    </div>
                    <span className="chart-subtitle">
                      {displayRows.length.toLocaleString('pt-BR')} {t('dashboard.groups')}
                      {capped && ` · ${t('dashboard.top')} ${MAX_ROWS}`}
                    </span>
                  </div>

                  {metrics.length > 1 && (
                    <div className="chart-legend">
                      {metrics.map((m) => (
                        <div key={m} className="legend-item">
                          <span className="legend-dot" style={{ background: colors[m] }} />
                          <span>{ml(m)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`dashboard-chart-scroll${['horizontal', 'stacked', 'table'].includes(autoChart) ? ' scroll-y' : ''}`}>
                    <Chart
                      tipo={autoChart}
                      rows={displayRows}
                      metrics={metrics}
                      colors={colors}
                      maxVal={maxVal}
                      lang={lang}
                      compact={compactValues}
                      onDrill={onDrill}
                      onHover={handleHover}
                      onLeave={() => setTooltip(null)}
                    />
                  </div>
                </>
              )}
            </motion.div>

            {/* Insights */}
            {!showEmptyState && insights.length > 0 && (
              <motion.div className="insight-card cyber-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
                <div className="insight-header">
                  <Lightbulb size={16} />
                  <span className="card-label">{t('dashboard.insights')}</span>
                </div>
                <div className="insight-list">
                  {insights.map((insight, i) => (
                    <div key={i} className={`insight-item insight-${insight.type}`}>
                      <div className="insight-icon">
                        {insight.type === 'high' && <TrendingUp size={14} />}
                        {insight.type === 'low' && <TrendingDown size={14} />}
                        {insight.type === 'warning' && <AlertTriangle size={14} />}
                        {insight.type === 'info' && <CheckCircle size={14} />}
                      </div>
                      <p className="insight-text">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ============ ABA SÉRIE SEMANAL ============ */}
        {tab === 'serie' && (
          <>
            <motion.div className="dashboard-controls cyber-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="controls-header">
                <LineChart size={16} />
                <span className="card-label">{t('dashboard.tab_serie')}</span>
                {(escopo !== null || serieRegioes.length > 0) && (
                  <button className="filter-reset-btn" onClick={resetSerie}>
                    <X size={14} />
                    {t('dashboard.clear')}
                  </button>
                )}
              </div>
              <div className="controls-grid">
                <div className="control-group">
                  <span className="control-label">{t('dashboard.escopo')}</span>
                  <div className="control-buttons">
                    <button className={`control-btn ${escopo === 'goiania' ? 'active' : ''}`} onClick={() => setEscopo('goiania')}>
                      {t('dashboard.goiania')}
                    </button>
                    <button className={`control-btn ${escopo === 'nacional' ? 'active' : ''}`} onClick={() => setEscopo('nacional')}>
                      {t('dashboard.nacional')}
                    </button>
                    <button className={`control-btn ${escopo === 'regioes' ? 'active' : ''}`} onClick={() => setEscopo('regioes')}>
                      {t('dashboard.regioes')}
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">{t('dashboard.metric')}</span>
                  <div className="control-buttons">
                    {METRICS.map((m) => (
                      <button key={m} className={`control-btn ${serieMetrica === m ? 'active' : ''}`} onClick={() => setSerieMetrica(m)}>
                        <span className="metric-dot" style={{ background: colors[m] }} />
                        {ml(m)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">{t('dashboard.chart')}</span>
                  <div className="control-buttons">
                    <button className={`control-btn ${serieTipo === 'linha' ? 'active' : ''}`} onClick={() => setSerieTipo('linha')}>
                      <GitCompare size={15} /> {t('dashboard.linha')}
                    </button>
                    <button
                      className={`control-btn ${serieTipo === 'empilhado' ? 'active' : ''}`}
                      onClick={() => setSerieTipo('empilhado')}
                      disabled={escopo === null || escopo === 'goiania' || escopo === 'nacional'}
                    >
                      <Layers size={15} /> {t('dashboard.empilhado')}
                    </button>
                  </div>
                </div>
              </div>

              {escopo === 'regioes' && (
                <div className="secondary-filters">
                  <span className="control-label">{t('dashboard.regiao')}</span>
                  <div className="control-buttons secondary-btns">
                    {REGIOES.map((reg) => (
                      <button
                        key={reg}
                        className={`control-btn ${serieRegioes.includes(reg) ? 'active' : ''}`}
                        onClick={() =>
                          setSerieRegioes((prev) =>
                            prev.includes(reg) ? prev.filter((r) => r !== reg) : [...prev, reg],
                          )
                        }
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div className="dashboard-chart-wrapper cyber-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              {serieVazia ? (
                <div className="empty-state">
                  <AlertCircle size={48} className="empty-icon" />
                  <h3 className="empty-title">{t('dashboard.empty_title_serie')}</h3>
                  <p className="empty-description">{t('dashboard.empty_description_serie')}</p>
                </div>
              ) : (
                <>
                  <div className="chart-header">
                    <div className="chart-title-wrap">
                      <span className="chart-title">
                        {escopo === 'goiania' ? `${t('dashboard.goiania')} — ${ml(serieMetrica)}` :
                         escopo === 'nacional' ? `${t('dashboard.nacional')} — ${ml(serieMetrica)}` :
                         `${t('dashboard.regioes')} — ${ml(serieMetrica)}`}
                      </span>
                    </div>
                    <span className="chart-subtitle">52 {t('dashboard.semanas')}</span>
                  </div>

                  {series.length > 1 && (
                    <div className="chart-legend">
                      {series.map((s) => (
                        <div key={s.nome} className="legend-item">
                          <span className="legend-dot" style={{ background: serieColors[s.nome] }} />
                          <span>{s.nome}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="dashboard-chart-scroll">
                    {serieTipo === 'linha' ? (
                      <SerieLine
                        series={series}
                        colors={serieColors}
                        onHover={handleHover}
                        onLeave={() => setTooltip(null)}
                      />
                    ) : (
                      <SerieStacked
                        series={series}
                        colors={serieColors}
                        onHover={handleHover}
                        onLeave={() => setTooltip(null)}
                      />
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </div>

      {tooltip && (
        <div
          className={`chart-tooltip${tooltip.kind === 'chart-blocked' ? ' chart-tooltip-blocked' : ''}`}
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}
        >
          {tooltip.kind === 'chart-blocked' ? (
            <AlertTriangle size={13} className="tooltip-blocked-icon" />
          ) : (
            tooltip.color && <span className="tooltip-dot" style={{ backgroundColor: tooltip.color, color: tooltip.color }} />
          )}
          <span className="tooltip-label">{tooltip.content}</span>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
