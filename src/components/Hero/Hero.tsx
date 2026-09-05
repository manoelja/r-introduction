import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MousePointer2, ChevronDown, Activity, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import MagneticButton from '../Common/MagneticButton';
import { useTypewriter } from '../../hooks/useTypewriter';
import { cleaningStats } from '../../data/covid';
import './Hero.css';

const WORDS_PT = ['Análise de Dados', 'COVID-19 2021', 'Qualidade de Dados'];
const WORDS_ES = ['Análisis de Datos', 'COVID-19 2021', 'Calidad de Datos'];
const WORDS_EN = ['Data Analysis', 'COVID-19 2021', 'Data Quality'];

const Hero = () => {
  const { t, i18n } = useTranslation();

  const words = useMemo(() => {
    switch (i18n.language) {
      case 'es': return WORDS_ES;
      case 'en': return WORDS_EN;
      default: return WORDS_PT;
    }
  }, [i18n.language]);

  const typewriterText = useTypewriter(words, 150, 2500);

  const pctLimpos = ((cleaningStats.finalRecords / cleaningStats.initialRecords) * 100).toFixed(1);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section id="hero" className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <motion.div
            className="hero-text"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="hero-badge" variants={itemVariants}>
              <span className="pulse-dot"></span>
              {t('hero.badge')}
            </motion.div>

            <motion.h1 className="hero-title" variants={itemVariants}>
              {t('hero.title_pre')} <br />
              <span className="highlight">
                {typewriterText}<span className="cursor">|</span>
              </span>
            </motion.h1>

            <motion.p className="hero-description" variants={itemVariants}>
              {t('hero.description')}
            </motion.p>

            <motion.div className="hero-btns" variants={itemVariants}>
              <MagneticButton href="#dashboard" className="btn btn-primary">
                {t('hero.view_dashboard')} <MousePointer2 size={18} />
              </MagneticButton>

              <div className="hero-socials">
                <motion.div
                  className="security-icon-hero"
                  whileHover={{ y: -3, color: 'var(--accent-color)' }}
                  title="Saúde"
                >
                  <Stethoscope size={24} />
                </motion.div>
                <motion.div
                  className="security-icon-hero"
                  whileHover={{ y: -3, color: 'var(--accent-color)' }}
                  title="Vigilância"
                >
                  <ShieldCheck size={24} />
                </motion.div>
                <motion.div
                  className="security-icon-hero"
                  whileHover={{ y: -3, color: 'var(--accent-color)' }}
                  title="Emergência"
                >
                  <HeartPulse size={24} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="system-status">
              <div className="status-header">
                <span>{t('hero.pipeline_status')}</span>
                <Activity size={14} className="pulse-icon" />
              </div>

              <div className="status-grid">
                <div className="status-item">
                  <div className="status-label">{t('hero.records_loaded')}</div>
                  <div className="status-value">{cleaningStats.initialRecords.toLocaleString('pt-BR')}</div>
                  <div className="status-bar">
                    <motion.div
                      className="status-progress"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, delay: 1 }}
                    ></motion.div>
                  </div>
                </div>

                <div className="status-item">
                  <div className="status-label">{t('hero.cleaned')}</div>
                  <div className="status-value">{cleaningStats.finalRecords.toLocaleString('pt-BR')}</div>
                  <div className="status-bar">
                    <motion.div
                      className="status-progress"
                      initial={{ width: 0 }}
                      animate={{ width: `${pctLimpos}%` }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                    ></motion.div>
                  </div>
                </div>

                <div className="status-item">
                  <div className="status-label">{t('hero.quality_score')}</div>
                  <div className="status-value">{pctLimpos}%</div>
                  <div className="status-bar">
                    <motion.div
                      className="status-progress"
                      initial={{ width: 0 }}
                      animate={{ width: `${pctLimpos}%` }}
                      transition={{ duration: 1.5, delay: 1.4 }}
                    ></motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="scroll-indicator" onClick={() => {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
      }}>
        <span>{t('hero.scroll')}</span>
        <ChevronDown size={24} color="var(--accent-color)" />
      </div>
    </section>
  );
};

export default Hero;
