import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Github, Linkedin, User, X } from 'lucide-react';
import Terminal from './Terminal';
import './Footer.css';

const authorLabels: Record<string, string> = {
  pt: 'Desenvolvido por Manoel — Data Scientist',
  en: 'Developed by Manoel — Data Scientist',
  es: 'Desarrollado por Manoel — Data Scientist',
};

// Conteúdo do card "Sobre o Desenvolvedor" — variação temática do projeto
const aboutTitles: Record<string, string> = {
  pt: 'Sobre o Desenvolvedor',
  en: 'About the Developer',
  es: 'Sobre el Desarrollador',
};

const aboutTexts: Record<string, string> = {
  pt: 'Sou Manoel, Data Scientist. Acredito que dados bem contados geram impacto: transformo bases públicas em histórias visuais e ferramentas acessíveis. Este dashboard de COVID-19 foi construído do zero — da limpeza da base em R ao pipeline em Node e à interface em React.',
  en: "I'm Manoel, a Data Scientist. I believe well-told data creates impact: I turn public datasets into visual stories and accessible tools. This COVID-19 dashboard was built from scratch — from cleaning the dataset in R to the Node pipeline and the React interface.",
  es: 'Soy Manoel, Data Scientist. Creo que los datos bien contados generan impacto: transformo bases públicas en historias visuales y herramientas accesibles. Este panel de COVID-19 fue construido desde cero — desde la limpieza de la base en R hasta el pipeline en Node y la interfaz en React.',
};

const copyrightTexts: Record<string, string> = {
  pt: '© 2026 DS.Manoel. Todos os direitos reservados.',
  en: '© 2026 DS.Manoel. All rights reserved.',
  es: '© 2026 DS.Manoel. Todos los derechos reservados.',
};

export default function Footer() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0];
  const [showAbout, setShowAbout] = useState(false);

  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-content">
          <motion.div
            className="footer-info"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="footer-title">{t('footer.title')}</h2>
            <p className="footer-desc">
              {t('footer.description')}
            </p>

            <p className="footer-author-credit">{authorLabels[currentLang] || authorLabels['pt']}</p>

            <div className="footer-social-icons">
              <motion.a
                href="https://github.com/manoelja/r-introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-color)' }}
              >
                <Github size={20} />
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/in/manoelja"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-color)' }}
              >
                <Linkedin size={20} />
              </motion.a>
              <motion.a
                href="https://manoelja.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-color)' }}
              >
                <img src="/manoelja.svg" alt="Portfolio" width="20" height="20" />
              </motion.a>
              <motion.button
                className="social-icon-btn"
                onClick={() => setShowAbout(!showAbout)}
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-color)' }}
              >
                <User size={20} />
              </motion.button>
            </div>

            <AnimatePresence>
              {showAbout && (
                <motion.div
                  className="developer-about-card"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="developer-about-header">
                    <h4>{aboutTitles[currentLang] || aboutTitles['pt']}</h4>
                    <button className="close-about-btn" onClick={() => setShowAbout(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <p className="developer-about-text">
                    {aboutTexts[currentLang] || aboutTexts['pt']}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="footer-terminal"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Terminal />
          </motion.div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-bottom-content container">
          <p className="footer-copyright-text">{copyrightTexts[currentLang] || copyrightTexts['pt']}</p>
        </div>
      </div>
    </footer>
  );
}
