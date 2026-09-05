import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Languages, ChevronDown, Menu, X } from 'lucide-react';
import { useActiveSection } from '../../hooks/useActiveSection';
import './Navbar.css';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [isLight, setIsLight] = useState(localStorage.getItem('theme') === 'light');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeSection = useActiveSection(['hero', 'about', 'skills', 'projects', 'dashboard', 'contact']);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Desativa transições durante a troca de tema: as cores vêm de variáveis
    // de :root e, sem isso, o navegador re-animaria toda a página
    // (transition: all 0.3-0.5s + backdrop-filter), causando o atraso
    // perceptível no navbar em dispositivos mobile.
    root.classList.add('no-theme-transition');

    if (isLight) {
      root.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }

    // Força o layout para aplicar o novo tema instantaneamente
    // e reabilita as transições logo em seguida
    root.getBoundingClientRect();
    root.classList.remove('no-theme-transition');
  }, [isLight]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages = [
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'ES', flag: '🇪🇸' }
  ];

  const navLinks = [
    { id: 'hero', label: t('nav.home') },
    { id: 'about', label: t('nav.about') },
    { id: 'skills', label: t('nav.skills') },
    { id: 'projects', label: t('nav.projects') },
    { id: 'dashboard', label: t('nav.dashboard') },
    { id: 'contact', label: t('nav.contact') },
  ];

  return (
    <motion.nav
      className={`navbar ${isScrolled ? 'shrunk' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container navbar-content">
        <div className="logo">
          COVID Goiânia
        </div>

        <ul className="nav-links desktop-only">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={activeSection === link.id ? 'active' : ''}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-controls">
          <button
            className="control-btn theme-toggle"
            onClick={() => setIsLight(!isLight)}
            aria-label="Toggle theme"
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="lang-container desktop-only">
            <button
              className={`control-btn lang-toggle ${isLangOpen ? 'active' : ''}`}
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-label="Change language"
            >
              <Languages size={18} />
              <span className="current-lang">{i18n.language.toUpperCase()}</span>
              <ChevronDown size={14} className={`chevron ${isLangOpen ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  className="lang-dropdown"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={`lang-option ${i18n.language === lang.code ? 'selected' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                    >
                      <span className="lang-flag">{lang.flag}</span>
                      <span className="lang-label">{lang.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            className="control-btn mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('nav.menu_close') : t('nav.menu_open')}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="mobile-drawer-header">
                <div className="logo">COVID Goiânia</div>
                <button
                  className="control-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <ul className="mobile-nav-links">
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <a
                      href={`#${link.id}`}
                      className={activeSection === link.id ? 'active' : ''}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <div className="mobile-drawer-footer">
                <p className="lang-title">{t('nav.change_language')}</p>
                <div className="mobile-lang-options">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={`mobile-lang-btn ${i18n.language === lang.code ? 'selected' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span>{lang.flag}</span> {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
