import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heart, ChevronDown, Activity, Globe, Target, AlertCircle, Database, FileText } from 'lucide-react';
import { cleaningStats, summaryStats } from '../../data/covid';
import DocumentPreviewModal, { type DocInfo } from './DocumentPreviewModal';
import './About.css';

const About = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];
  const [expandedEdu, setExpandedEdu] = useState<string | null>(null);
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocInfo | null>(null);

  const docs = useMemo<DocInfo[]>(() => {
    const L = (pt: string, en: string, es: string) => (lang === 'en' ? en : lang === 'es' ? es : pt);
    const br = (n: number) => n.toLocaleString('pt-BR');
    const pct = ((cleaningStats.finalRecords / cleaningStats.initialRecords) * 100).toFixed(1);

    return [
      {
        name: L('Resumo Técnico', 'Technical Summary', 'Resumen Técnico'),
        slug: 'Resumo_Tecnico',
        summary: [
          {
            heading: L('O que é', 'What it is', 'Qué es'),
            items: [
              L(
                'Uma atividade avaliativa de análise de dados que virou um site: casos e óbitos de COVID-19 em Goiânia durante 2021, contados de forma simples e visual.',
                'A course assignment on data analysis that became a website: COVID-19 cases and deaths in Goiânia during 2021, told simply and visually.',
                'Un trabajo evaluativo de análisis de datos que se convirtió en un sitio web: casos y muertes por COVID-19 en Goiânia durante 2021, contados de forma simple y visual.',
              ),
              L(
                `A base é nacional, do Ministério da Saúde: ${br(cleaningStats.initialRecords)} registros organizados por município e semana epidemiológica.`,
                `The dataset is national, from the Ministry of Health: ${br(cleaningStats.initialRecords)} records organized by municipality and epidemiological week.`,
                `La base es nacional, del Ministerio de Salud: ${br(cleaningStats.initialRecords)} registros organizados por municipio y semana epidemiológica.`,
              ),
            ],
          },
          {
            heading: L('Os dados', 'The data', 'Los datos'),
            items: [
              L(
                'Colunas principais: UF, Município, Metro/Interior, Ano_Semana, casos acumulados, casos novos, óbitos acumulados e óbitos novos.',
                'Main columns: State, Municipality, Metro/Interior, Year_Week, cumulative cases, new cases, cumulative deaths and new deaths.',
                'Columnas principales: UF, Municipio, Metro/Interior, Año_Semana, casos acumulados, casos nuevos, muertes acumuladas y muertes nuevas.',
              ),
              L(
                'Cada linha representa um município em uma semana epidemiológica de 2021.',
                'Each row represents a municipality in an epidemiological week of 2021.',
                'Cada fila representa un municipio en una semana epidemiológica de 2021.',
              ),
            ],
          },
          {
            heading: L('Problemas encontrados', 'Problems found', 'Problemas encontrados'),
            items: [
              L(
                `${br(cleaningStats.steps[0].removed)} registros sem município identificado — não dava para saber onde aconteceram.`,
                `${br(cleaningStats.steps[0].removed)} records without an identified municipality — it was impossible to know where they happened.`,
                `${br(cleaningStats.steps[0].removed)} registros sin municipio identificado — no se podía saber dónde ocurrieron.`,
              ),
              L(
                `${br(cleaningStats.steps[1].removed)} registros da "semana 53" — uma semana extra que não faz parte do calendário oficial de 2021.`,
                `${br(cleaningStats.steps[1].removed)} records from "week 53" — an extra week that is not part of the official 2021 calendar.`,
                `${br(cleaningStats.steps[1].removed)} registros de la "semana 53" — una semana extra que no forma parte del calendario oficial de 2021.`,
              ),
              L(
                `${cleaningStats.corrections[0].count} valores negativos de casos novos — corrigidos para 0, porque não existe menos que nenhum caso.`,
                `${cleaningStats.corrections[0].count} negative new-case values — corrected to 0, since fewer than zero cases do not exist.`,
                `${cleaningStats.corrections[0].count} valores negativos de casos nuevos — corregidos a 0, porque no existe menos que cero casos.`,
              ),
            ],
          },
          {
            heading: L('O que foi feito', 'What was done', 'Lo que se hizo'),
            items: [
              L(
                'Padronizamos os nomes das colunas e removemos espaços extras nos textos.',
                'We standardized column names and removed extra whitespace from text fields.',
                'Estandarizamos los nombres de las columnas y eliminamos espacios extra en los textos.',
              ),
              L(
                'Filtramos apenas o ano de 2021 (semanas 1 a 52) e garantimos registros únicos.',
                'We kept only the year 2021 (weeks 1 to 52) and ensured unique records.',
                'Filtramos solo el año 2021 (semanas 1 a 52) y garantizamos registros únicos.',
              ),
              L(
                `Total: ${br(cleaningStats.removedRecords)} registros removidos (${(100 - Number(pct)).toFixed(1)}%) — restaram ${br(cleaningStats.finalRecords)} limpos.`,
                `Total: ${br(cleaningStats.removedRecords)} records removed (${(100 - Number(pct)).toFixed(1)}%) — ${br(cleaningStats.finalRecords)} clean records remained.`,
                `Total: ${br(cleaningStats.removedRecords)} registros eliminados (${(100 - Number(pct)).toFixed(1)}%) — quedaron ${br(cleaningStats.finalRecords)} limpios.`,
              ),
            ],
          },
          {
            heading: L('Novas colunas criadas', 'New columns created', 'Nuevas columnas creadas'),
            items: [
              L(
                'Metro/Interior virou uma categoria com 2 níveis: Reg. Metropolitana e Interior.',
                'Metro/Interior became a category with 2 levels: Metropolitan Region and Interior.',
                'Metro/Interior se convirtió en una categoría con 2 niveles: Región Metropolitana e Interior.',
              ),
              L(
                'Região foi criada a partir da UF, agrupando os 27 estados nas 5 regiões do Brasil.',
                'Region was created from the State, grouping all 27 states into Brazil\'s 5 regions.',
                'Región se creó a partir de la UF, agrupando los 27 estados en las 5 regiones de Brasil.',
              ),
            ],
          },
          {
            heading: L('Como os dados chegam ao site', 'How data reaches the site', 'Cómo llegan los datos al sitio'),
            items: [
              L(
                'A análise original foi feita em R (r-introducion.Rmd); um script Node replica a mesma limpeza e gera os dados do site.',
                'The original analysis was done in R (r-introducion.Rmd); a Node script replicates the same cleaning and generates the site data.',
                'El análisis original se hizo en R (r-introducion.Rmd); un script Node replica la misma limpieza y genera los datos del sitio.',
              ),
              L(
                'Pipeline: R → script Node (export-data.mjs) → src/data/covid.ts → dashboard. Basta rodar npm run data:export.',
                'Pipeline: R → Node script (export-data.mjs) → src/data/covid.ts → dashboard. Just run npm run data:export.',
                'Pipeline: R → script Node (export-data.mjs) → src/data/covid.ts → panel. Basta ejecutar npm run data:export.',
              ),
            ],
          },
        ],
      },
      {
        name: L('Resultados da Análise', 'Analysis Results', 'Resultados del Análisis'),
        slug: 'Resultados_Analise',
        summary: [
          {
            heading: L('Goiânia em números (Item 6)', 'Goiânia in numbers (Item 6)', 'Goiânia en números (Ítem 6)'),
            items: [
              `${br(summaryStats.goiania.casosAcumulados)} ${L('casos acumulados ao final de 2021', 'cumulative cases by the end of 2021', 'casos acumulados al final de 2021')}`,
              `${br(summaryStats.goiania.obitosAcumulados)} ${L('óbitos acumulados ao final de 2021', 'cumulative deaths by the end of 2021', 'muertes acumuladas al final de 2021')}`,
              `${br(summaryStats.goiania.casosNovos)} ${L('casos novos notificados em 2021', 'new cases reported in 2021', 'casos nuevos notificados en 2021')}`,
              `${br(summaryStats.goiania.obitosNovos)} ${L('óbitos novos notificados em 2021', 'new deaths reported in 2021', 'muertes nuevas notificadas en 2021')}`,
            ],
          },
          {
            heading: L('Semana a semana (Itens 7 e 8)', 'Week by week (Items 7 and 8)', 'Semana a semana (Ítems 7 y 8)'),
            items: [
              L(
                'Os gráficos de linha mostram a evolução de casos e óbitos acumulados nas 52 semanas, incluindo o pico da segunda onda em meados do ano.',
                'Line charts show the evolution of cumulative cases and deaths across the 52 weeks, including the second-wave peak in mid-year.',
                'Los gráficos de línea muestran la evolución de casos y muertes acumulados en las 52 semanas, incluido el pico de la segunda ola a mediados de año.',
              ),
              L(
                'A curva de óbitos é mais suave e vem depois da de casos — o que é esperado numa pandemia.',
                'The death curve is smoother and lags the case curve — which is expected in a pandemic.',
                'La curva de muertes es más suave y llega después de la de casos — lo esperado en una pandemia.',
              ),
            ],
          },
          {
            heading: L('O Brasil por regiões (Item 10)', 'Brazil by region (Item 10)', 'Brasil por regiones (Ítem 10)'),
            items: [
              L(
                'As barras empilhadas mostram os óbitos acumulados por semana, divididos pelas 5 regiões.',
                'Stacked bars show cumulative deaths per week, split by the 5 regions.',
                'Las barras apiladas muestran las muertes acumuladas por semana, divididas por las 5 regiones.',
              ),
              L(
                'Dá para ver que as regiões tiveram ondas em momentos diferentes — o Sudeste antes, o Norte e o Nordeste depois.',
                'You can see regions had waves at different times — the Southeast earlier, the North and Northeast later.',
                'Se puede ver que las regiones tuvieron olas en momentos distintos — el Sudeste antes, el Norte y el Nordeste después.',
              ),
            ],
          },
          {
            heading: L('Metropolitana vs Interior', 'Metropolitan vs Interior', 'Metropolitana vs Interior'),
            items: [
              L(
                'O dashboard compara Região Metropolitana e Interior, mostrando como a doença se concentrou na capital e arredores.',
                'The dashboard compares the Metropolitan Region and the Interior, showing how the disease concentrated in the capital and surroundings.',
                'El panel compara la Región Metropolitana y el Interior, mostrando cómo la enfermedad se concentró en la capital y alrededores.',
              ),
            ],
          },
          {
            heading: L('Cobertura', 'Coverage', 'Cobertura'),
            items: [
              L(
                `${br(summaryStats.totalMunicipios)} municípios · ${summaryStats.totalUFs} UFs · 5 regiões.`,
                `${br(summaryStats.totalMunicipios)} municipalities · ${summaryStats.totalUFs} states · 5 regions.`,
                `${br(summaryStats.totalMunicipios)} municipios · ${summaryStats.totalUFs} UFs · 5 regiones.`,
              ),
              L(
                `${summaryStats.goiania.semanas} semanas epidemiológicas completas de 2021.`,
                `${summaryStats.goiania.semanas} complete epidemiological weeks of 2021.`,
                `${summaryStats.goiania.semanas} semanas epidemiológicas completas de 2021.`,
              ),
              L(
                '7 tipos de gráfico, filtros combináveis e drill-down Nacional → Região → UF → Município.',
                '7 chart types, combinable filters and drill-down National → Region → State → Municipality.',
                '7 tipos de gráfico, filtros combinables y drill-down Nacional → Región → UF → Municipio.',
              ),
            ],
          },
        ],
      },
    ];
  }, [lang]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const toggleEdu = (id: string) => {
    setExpandedEdu(expandedEdu === id ? null : id);
  };

  return (
    <section id="about" className="about">
      <div className="container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('about.title')}
        </motion.h2>

        <motion.div
          className="about-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div className="about-info" variants={itemVariants}>
            <div
              className="about-card-main cyber-card"
              onClick={() => setIsMainExpanded(!isMainExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <div className="about-card-header">
                <div className="about-card-header-label">
                  <Heart size={20} color="var(--accent-color)" />
                  <span className="card-label">{t('about.data_report')}</span>
                </div>
                <div
                  style={{ transform: isMainExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                >
                  <ChevronDown size={20} opacity={0.5} />
                </div>
              </div>

              <div className="about-content-wrapper">
                <AnimatePresence mode="wait">
                  {!isMainExpanded ? (
                    <motion.div
                      key="preview"
                      className="about-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <p className="about-description-text">
                        {t('about.preview_text')}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="details"
                      className="about-details-expanded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="profile-deep-dive">
                        <p className="deep-text">
                          <span style={{ color: 'var(--accent-color)' }}>&gt;</span> {t('about.detailed_profile')}
                        </p>

                        <div className="mission-box">
                          <div className="mission-header">
                            <Target size={16} color="var(--accent-color)" />
                            <span className="card-label">{t('about.mission_objective')}</span>
                          </div>
                          <p className="mission-body">{t('about.mission_text')}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="about-details-list">
                <div className="detail-item-modern">
                  <Activity size={16} color="var(--accent-color)" />
                  <div className="detail-info-wrap">
                    <span className="detail-label">{t('about.initial')}</span>
                    <span className="detail-value">{cleaningStats.initialRecords.toLocaleString('pt-BR')} {t('about.records')}</span>
                  </div>
                </div>
                <div className="detail-item-modern">
                  <Globe size={16} color="var(--accent-color)" />
                  <div className="detail-info-wrap">
                    <span className="detail-label">{t('about.final')}</span>
                    <span className="detail-value">{cleaningStats.finalRecords.toLocaleString('pt-BR')} {t('about.records')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de documentação técnica — abrem o modal de pré-visualização */}
            <motion.div
              className="about-doc-buttons"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {docs.map((doc) => (
                <button
                  key={doc.slug}
                  type="button"
                  className="doc-preview-btn"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <FileText size={20} />
                  <span>{doc.name}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div className="about-education" variants={itemVariants}>
            <div
              className="edu-card-modern cyber-card"
              onClick={() => toggleEdu('cert1')}
              style={{ cursor: 'pointer' }}
            >
              <div className="edu-header-row">
                <div className="edu-icon-container">
                  <Heart size={24} />
                </div>
                <div className="edu-content">
                  <span className="edu-type">{t('about.graduation_label')}</span>
                  <h3 className="edu-title">{t('about.graduation_title')}</h3>
                </div>
                <div
                  style={{ transform: expandedEdu === 'cert1' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                >
                  <ChevronDown size={20} opacity={0.5} />
                </div>
              </div>

              <div className="edu-content-wrapper">
                <AnimatePresence mode="wait">
                  {expandedEdu !== 'cert1' ? (
                    <motion.div
                      key="preview"
                      className="edu-badge"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      296.323 ROWS
                    </motion.div>
                  ) : (
                    <motion.div
                      key="detail"
                      className="edu-details-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="edu-institution">
                        <span className="inst-name">{t('about.status_verified')}</span>
                        <span className="inst-full">{t('about.graduation_inst')}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div
              className="edu-card-modern cyber-card"
              onClick={() => toggleEdu('cert2')}
              style={{ cursor: 'pointer' }}
            >
              <div className="edu-header-row">
                <div className="edu-icon-container">
                  <Database size={24} />
                </div>
                <div className="edu-content">
                  <span className="edu-type">{t('about.postgrad_label')}</span>
                  <h3 className="edu-title">{t('about.postgrad_title')}</h3>
                </div>
                <div
                  style={{ transform: expandedEdu === 'cert2' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                >
                  <ChevronDown size={20} opacity={0.5} />
                </div>
              </div>

              <div className="edu-content-wrapper">
                <AnimatePresence mode="wait">
                  {expandedEdu !== 'cert2' ? (
                    <motion.div
                      key="preview"
                      className="edu-badge"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      R → TS
                    </motion.div>
                  ) : (
                    <motion.div
                      key="detail"
                      className="edu-details-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="edu-institution">
                        <span className="inst-name">{t('about.status_authorized')}</span>
                        <span className="inst-full">{t('about.postgrad_inst')}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mission-box about-alert-box">
              <div className="about-alert-header">
                <AlertCircle size={14} />
                <span className="card-label">{t('about.pipeline_status_active')}</span>
              </div>
              <p className="about-alert-body">{t('about.pipeline_alert')}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </section>
  );
};

export default About;
