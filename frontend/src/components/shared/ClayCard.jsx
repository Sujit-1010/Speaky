import { motion } from 'framer-motion';

export default function ClayCard({ 
  children, 
  className = '', 
  hover = true,
  onClick = undefined,
  gradient = false,
  elevated = false 
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -6, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`clay-card ${elevated ? 'card-elevated' : ''} p-6 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: gradient 
          ? 'linear-gradient(145deg, #faf5ff, #eff6ff)' 
          : 'linear-gradient(145deg, #ffffff, #f5f7ff)',
        boxShadow: elevated 
          ? '0 20px 60px rgba(79, 70, 229, 0.15), 0 8px 20px rgba(79, 70, 229, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
          : undefined
      }}
    >
      {children}
    </motion.div>
  );
}