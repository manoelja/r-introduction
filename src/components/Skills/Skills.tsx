import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { techStack } from '../../data/tech';
import './Skills.css';

const Skills = () => {
  const { t } = useTranslation();
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const toggleSkill = (name: string) => {
    setExpandedSkill(expandedSkill === name ? null : name);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <section id="skills" className="skills">
      <div className="container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('skills.title')}
        </motion.h2>

        <motion.div
          className="skills-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {techStack.map((skill) => (
            <div
              key={skill.name}
              className="skill-badge cyber-card"
              onClick={() => toggleSkill(skill.name)}
              style={{ cursor: 'pointer' }}
            >
              <div className="skill-content-wrapper">
                <AnimatePresence mode="wait">
                  {expandedSkill !== skill.name ? (
                    <motion.div
                      key="header"
                      className="skill-header"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="skill-main-info">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-category">{skill.category}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="detail"
                      className="skill-detail-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <span className="skill-name-detail">{skill.name}</span>
                      <p>{skill.detail}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Skills;
