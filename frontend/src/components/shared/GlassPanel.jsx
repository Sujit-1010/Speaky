import { motion } from 'framer-motion';

export default function GlassPanel({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}