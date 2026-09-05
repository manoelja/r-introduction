import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Database, MapPin, Globe, Calendar } from 'lucide-react';
import { analysisResults } from '../../data/analyses';
import { summaryStats } from '../../data/covid';
import './Projects.css';

const Projects = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0];
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleProject = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const summaryCards = [
    { icon: <Database size={20} />, value: summaryStats.totalRegistros.toLocaleString('pt-BR'), label: t('projects.registros_limpos') },
    { icon: <MapPin size={20} />, value: summaryStats.totalMunicipios.toLocaleString('pt-BR'), label: t('projects.municipios') },
    { icon: <Globe size={20} />, value: String(summaryStats.totalUFs), label: t('projects.ufs') },
    { icon: <Calendar size={20} />, value: String(summaryStats.goiania.semanas), label: t('projects.semanas') },
  ];

  return (
    <section id="projects" className="projects">
      <div className="container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('projects.title')}
        </motion.h2>

        {/* Cards de resumo */}
        <motion.div
          className="projects-summary-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {summaryCards.map((card, i) => (
            <motion.div key={i} className="summary-card cyber-card" variants={itemVariants}>
              <div className="summary-icon">{card.icon}</div>
              <div className="summary-value">{card.value}</div>
              <div className="summary-label">{card.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="analysis-section">
          <h3 className="region-title">{t('projects.results_title')}</h3>
        </div>

        <motion.div
          className="projects-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {analysisResults.map((project) => (
            <motion.div
              key={project.id}
              className="project-card cyber-card"
              variants={itemVariants}
              onClick={() => toggleProject(project.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="skill-content-wrapper">
                <AnimatePresence mode="wait">
                  {expandedId !== project.id ? (
                    <motion.div
                      key="preview"
                      className="project-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="project-header">
                        <span className="project-category">
                          {project.category[currentLang] || project.category['pt']}
                        </span>
                      </div>
                      <h3 className="project-title">{project.title[currentLang] || project.title['pt']}</h3>
                      <p className="project-desc">
                        {project.description[currentLang] || project.description['pt']}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="details"
                      className="project-detail-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="project-header">
                        <span className="project-category">
                          {project.category[currentLang] || project.category['pt']}
                        </span>
                      </div>
                      <h3 className="project-title-expanded">{project.title[currentLang] || project.title['pt']}</h3>
                      <div className="project-details">
                        <div className="detail-item">
                          <strong>{t('projects.problem')}</strong> {project.problem[currentLang] || project.problem['pt']}
                        </div>
                        <div className="detail-item">
                          <strong>{t('projects.result')}</strong> {project.result[currentLang] || project.result['pt']}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="project-tags">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Projects;
