import { motion } from 'framer-motion';

interface MagneticButtonProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

const MagneticButton = ({ href, className, children }: MagneticButtonProps) => {
  return (
    <motion.a
      href={href}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.a>
  );
};

export default MagneticButton;
