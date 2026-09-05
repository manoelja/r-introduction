import { motion } from 'framer-motion';
import type { ChartRow, Metric, SerieLinha } from './aggregate';
import { metricLabels } from './aggregate';

export type ChartType = 'bar' | 'horizontal' | 'grouped' | 'stacked' | 'line' | 'donut' | 'table';

interface ChartCommonProps {
  rows: ChartRow[];
  metrics: Metric[];
  colors: Record<Metric, string>;
  maxVal: number;
  lang: string;
  compact?: boolean; // muitas linhas → valores abreviados (100k, 1,2M)
  onDrill: (row: ChartRow) => void;
  onHover: (e: React.MouseEvent, content: string, color?: string) => void;
  onLeave: () => void;
}

const fmt = (v: number) => (v > 100 ? v.toLocaleString('pt-BR') : String(Math.round(v * 10) / 10));

// Formato compacto para muitos grupos: 1000 → 1k, 1.250.000 → 1,3M
const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    const m = v / 1_000_000;
    return `${(Math.round(m * 10) / 10).toLocaleString('pt-BR')}M`;
  }
  if (abs >= 1_000) {
    const k = v / 1_000;
    return `${(Math.round(k * 10) / 10).toLocaleString('pt-BR')}k`;
  }
  return String(Math.round(v * 10) / 10);
};

// Escolhe o formatador conforme a quantidade de linhas
const pickFmt = (rows: ChartRow[], compact?: boolean) => {
  const useCompact = compact ?? rows.length > 12;
  return useCompact ? fmtCompact : fmt;
};

const metricLabel = (m: Metric, lang: string) =>
  metricLabels[m][(lang as 'pt' | 'en' | 'es')] || metricLabels[m].pt;

/* ============ BARRA VERTICAL ============ */
const BarChart = ({ rows, metrics, colors, maxVal, onDrill, onHover, onLeave, compact }: ChartCommonProps) => {
  const m = metrics[0];
  const color = colors[m];
  const f = pickFmt(rows, compact);
  return (
    <div className={`bar-chart${compact ? ' compact' : ''}`}>
      {rows.map((row, i) => {
        const value = row.values[m];
        const h = (value / maxVal) * 100;
        return (
          <div
            key={`${row.group}-${row.label}`}
            className={`bar-col ${row.drillable ? 'clickable' : ''}`}
            onClick={() => row.drillable && onDrill(row)}
            onMouseEnter={(e) => onHover(e, `${row.label}: ${fmt(value)}`, color)}
            onMouseLeave={onLeave}
          >
            <div className="bar-value">{f(value)}</div>
            <div className="bar-track">
              <motion.div
                className="bar-fill"
                style={{ backgroundColor: color }}
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
              />
            </div>
            <div className="bar-label">{row.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ============ BARRA HORIZONTAL ============ */
const HBarChart = ({ rows, metrics, colors, maxVal, onDrill, onHover, onLeave, compact }: ChartCommonProps) => {
  const m = metrics[0];
  const color = colors[m];
  const f = pickFmt(rows, compact);
  return (
    <div className="hbar-chart">
      {rows.map((row, i) => {
        const value = row.values[m];
        return (
          <div
            key={`${row.group}-${row.label}`}
            className={`hbar-row ${row.drillable ? 'clickable' : ''}`}
            onClick={() => row.drillable && onDrill(row)}
            onMouseEnter={(e) => onHover(e, `${row.label}: ${fmt(value)}`, color)}
            onMouseLeave={onLeave}
          >
            <div className="hbar-label">{row.label}</div>
            <div className="hbar-track">
              <motion.div
                className="hbar-fill"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(value / maxVal) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
              />
            </div>
            <div className="hbar-value">{f(value)}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ============ AGRUPADO ============ */
const GroupedChart = ({ rows, metrics, colors, maxVal, onDrill, onHover, onLeave, compact }: ChartCommonProps) => {
  const f = pickFmt(rows, compact);
  return (
  <div className={`grouped-chart${compact ? ' compact' : ''}`}>
    {rows.map((row, i) => (
      <div key={`${row.group}-${row.label}`} className={`grouped-col ${row.drillable ? 'clickable' : ''}`} onClick={() => row.drillable && onDrill(row)}>
        <div className="grouped-bars">
          {metrics.map((m, j) => (
            <div
              key={m}
              className="grouped-bar-wrapper"
              onMouseEnter={(e) => onHover(e, `${metricLabel(m, '').replace(/^./, (c) => c.toUpperCase())}: ${fmt(row.values[m])}`, colors[m])}
              onMouseLeave={onLeave}
            >
              <div className="bar-value small">{f(row.values[m])}</div>
              <div className="bar-track narrow">
                <motion.div
                  className="bar-fill"
                  style={{ backgroundColor: colors[m] }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(row.values[m] / maxVal) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 + j * 0.03 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="bar-label">{row.label}</div>
      </div>
    ))}
  </div>
  );
};

/* ============ EMPILHADO (métricas por linha) ============ */
const StackedChart = ({ rows, metrics, colors, onHover, onLeave, compact }: ChartCommonProps) => {
  const f = pickFmt(rows, compact);
  return (
  <div className="hbar-chart">
    {rows.map((row, i) => {
      const total = metrics.reduce((acc, m) => acc + row.values[m], 0) || 1;
      return (
        <div key={`${row.group}-${row.label}`} className="hbar-row">
          <div className="hbar-label">{row.label}</div>
          <div className="hbar-track tall">
            <div className="stacked-bar">
              {metrics.map((m, j) => (
                <motion.div
                  key={m}
                  className="stacked-segment"
                  style={{ backgroundColor: colors[m] }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(row.values[m] / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 + j * 0.03 }}
                  onMouseEnter={(e) => onHover(e, `${metricLabel(m, '')}: ${fmt(row.values[m])}`, colors[m])}
                  onMouseLeave={onLeave}
                />
              ))}
            </div>
          </div>
          <div className="hbar-value">{f(total)}</div>
        </div>
      );
    })}
  </div>
  );
};

/* ============ LINHA ============ */
const LineChart = ({ rows, metrics, colors, maxVal, onDrill, onHover, onLeave, compact }: ChartCommonProps) => {
  const f = pickFmt(rows, compact);
  const W = Math.max(rows.length * 80 + 40, 300);
  const H = 220;
  const innerH = 150;
  const getY = (v: number) => 35 + (1 - v / maxVal) * innerH;
  return (
    <div className="line-chart-wrapper">
      <svg viewBox={`0 0 ${W} ${H}`} className="line-chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1="35"
            y1={getY(maxVal * frac)}
            x2={W - 10}
            y2={getY(maxVal * frac)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}
        {metrics.map((m) => {
          const points = rows.map((row, i) => `${55 + i * 80},${getY(row.values[m])}`).join(' ');
          return (
            <g key={m}>
              <polyline points={points} fill="none" stroke={colors[m]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
              <polyline points={points} fill="none" stroke={colors[m]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {rows.map((row, i) => {
                const x = 55 + i * 80;
                const y = getY(row.values[m]);
                return (
                  <g key={`${m}-${i}`}>
                    <circle cx={x} cy={y} r="3.5" fill={colors[m]} opacity="0.35" />
                    <circle
                      cx={x}
                      cy={y}
                      r="2.2"
                      fill={colors[m]}
                      className={row.drillable ? 'clickable' : ''}
                      onClick={() => row.drillable && onDrill(row)}
                      onMouseEnter={(e) => onHover(e, `${row.label}: ${fmt(row.values[m])}`, colors[m])}
                      onMouseLeave={onLeave}
                    />
                    <text x={x + 8} y={y - 6} fill="var(--text-secondary)" fontSize="7" textAnchor="start" fontWeight="600">
                      {f(row.values[m])}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        {rows.map((row, i) => (
          <text key={`l-${i}`} x={55 + i * 80} y={H - 8} fill="var(--text-secondary)" fontSize="9" textAnchor="middle" fontWeight="600">
            {row.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

/* ============ DONUT (participação por linha) ============ */
const DonutChart = ({ rows, metrics, colors, onDrill, onHover, onLeave, compact }: ChartCommonProps) => {
  const f = pickFmt(rows, compact);
  const m = metrics[0];
  const total = rows.reduce((acc, r) => acc + r.values[m], 0) || 1;
  const r = 80;
  const cx = 110;
  const cy = 110;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="donut-chart-wrapper">
      <svg viewBox="0 0 220 220" className="donut-svg">
        {rows.map((row, i) => {
          const frac = row.values[m] / total;
          const dash = frac * circumference;
          // Deslocamento acumulado calculado de forma funcional (sem mutação em render)
          const start = rows.slice(0, i).reduce((acc, r) => acc + r.values[m], 0) * (circumference / total);
          return (
            <circle
              key={`${row.group}-${row.label}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={colors[m]}
              strokeWidth="26"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-start}
              className={row.drillable ? 'clickable' : ''}
              onClick={() => row.drillable && onDrill(row)}
              onMouseEnter={(e) => onHover(e, `${row.label}: ${fmt(row.values[m])} (${(frac * 100).toFixed(1)}%)`, colors[m])}
              onMouseLeave={onLeave}
              style={{ cursor: row.drillable ? 'pointer' : 'default' }}
            />
          );
        })}
        <text x={cx} y={cy - 4} fill="var(--text-primary)" fontSize="14" textAnchor="middle" fontWeight="800">
          {metricLabel(m, '').toUpperCase()}
        </text>
        <text x={cx} y={cy + 16} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
          {f(total)}
        </text>
      </svg>
    </div>
  );
};

/* ============ TABELA ============ */

// Título da coluna de nomes conforme o nível (Regiões / UFs / Municípios)
const groupTitle = (group: string, lang: string): string => {
  if (group === 'UF') return lang === 'pt' ? 'UFs' : lang === 'es' ? 'UFs' : 'States';
  if (group === 'Município') return lang === 'pt' ? 'Municípios' : lang === 'es' ? 'Municipios' : 'Municipalities';
  if (group === 'Metro/Interior') return lang === 'pt' ? 'Metro/Interior' : lang === 'es' ? 'Metro/Interior' : 'Metro/Interior';
  return lang === 'pt' ? 'Regiões' : lang === 'es' ? 'Regiones' : 'Regions';
};

const DataTable = ({ rows, metrics, colors, onDrill, lang, compact }: ChartCommonProps) => {
  const f = pickFmt(rows, compact);
  return (
  <div className="data-table-wrapper">
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>{rows[0] ? groupTitle(rows[0].group, lang) : ''}</th>
          {metrics.map((m) => (
            <th key={m}>
              <span className="th-dot" style={{ background: colors[m] }} />
              {metricLabel(m, lang)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={`${row.group}-${row.label}`} className={row.drillable ? 'clickable' : ''} onClick={() => row.drillable && onDrill(row)}>
            <td className="table-index">{idx + 1}</td>
            <td className="table-label">{row.label}</td>
            {metrics.map((m) => (
              <td key={m} className="table-value" style={{ color: colors[m] }}>
                {f(row.values[m])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

/* ============ EXPORTAÇÃO PRINCIPAL ============ */
export const Chart = ({ tipo, ...props }: ChartCommonProps & { tipo: ChartType }) => {
  switch (tipo) {
    case 'bar': return <BarChart {...props} />;
    case 'horizontal': return <HBarChart {...props} />;
    case 'grouped': return <GroupedChart {...props} />;
    case 'stacked': return <StackedChart {...props} />;
    case 'line': return <LineChart {...props} />;
    case 'donut': return <DonutChart {...props} />;
    case 'table': return <DataTable {...props} />;
  }
};

/* ============ SÉRIE SEMANAL ============ */

interface SerieProps {
  series: SerieLinha[];
  colors: Record<string, string>;
  onHover: (e: React.MouseEvent, content: string, color?: string) => void;
  onLeave: () => void;
}

/** Linhas múltiplas — semana no eixo X (itens 7 e 8). */
export const SerieLine = ({ series, colors, onHover, onLeave }: SerieProps) => {
  const semanas = series[0]?.pontos.map((p) => p.semana) ?? [];
  const maxVal = Math.max(...series.flatMap((s) => s.pontos.map((p) => p.valor)), 1);
  const W = Math.max(semanas.length * 14 + 60, 300);
  const H = 230;
  const innerH = 160;
  const getX = (semana: number) => 40 + ((semana - 1) / 51) * (W - 70);
  const getY = (v: number) => 30 + (1 - v / maxVal) * innerH;
  return (
    <div className="line-chart-wrapper">
      <svg viewBox={`0 0 ${W} ${H}`} className="line-chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line key={frac} x1="35" y1={getY(maxVal * frac)} x2={W - 20} y2={getY(maxVal * frac)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}
        {series.map((s) => {
          const color = colors[s.nome] || colors.default;
          const points = s.pontos.map((p) => `${getX(p.semana)},${getY(p.valor)}`).join(' ');
          return (
            <g key={s.nome}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
              <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {s.pontos.map((p, i) => (
                <circle
                  key={i}
                  cx={getX(p.semana)}
                  cy={getY(p.valor)}
                  r="2"
                  fill={color}
                  onMouseEnter={(e) => onHover(e, `${s.nome} · Sem ${p.semana}: ${fmt(p.valor)}`, color)}
                  onMouseLeave={onLeave}
                />
              ))}
            </g>
          );
        })}
        <text x={40} y={H - 6} fill="var(--text-secondary)" fontSize="9" textAnchor="middle">Sem 1</text>
        <text x={W - 30} y={H - 6} fill="var(--text-secondary)" fontSize="9" textAnchor="middle">Sem 52</text>
      </svg>
    </div>
  );
};

/** Barras empilhadas por semana — participação das regiões (item 10). */
export const SerieStacked = ({ series, colors, onHover, onLeave }: SerieProps) => {
  const semanas = series[0]?.pontos.map((p) => p.semana) ?? [];
  const maxVal = Math.max(...series.flatMap((s) => s.pontos.map((p) => p.valor)), 1);
  return (
    <div className="serie-stacked-wrapper">
      {semanas.map((semana, i) => (
        <div key={semana} className="serie-stacked-col">
          <div className="serie-stacked-track">
            {series.map((s) => {
              const p = s.pontos.find((pt) => pt.semana === semana);
              const h = ((p?.valor ?? 0) / maxVal) * 100;
              if (h <= 0) return null;
              return (
                <motion.div
                  key={s.nome}
                  className="serie-stacked-segment"
                  style={{ backgroundColor: colors[s.nome] || colors.default }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.01 }}
                  onMouseEnter={(e) => onHover(e, `${s.nome} · Sem ${semana}: ${fmt(p!.valor)}`, colors[s.nome] || colors.default)}
                  onMouseLeave={onLeave}
                />
              );
            })}
          </div>
          {(i === 0 || i === semanas.length - 1 || i % 10 === 0) && (
            <div className="serie-stacked-label">{semana}</div>
          )}
        </div>
      ))}
    </div>
  );
};
