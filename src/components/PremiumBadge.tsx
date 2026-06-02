import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

const containerClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

export const PremiumBadge = ({ size = 'md', className, showTooltip = false }: PremiumBadgeProps) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        'relative inline-flex items-center justify-center',
        containerClasses[size],
        className
      )}
      title={showTooltip ? 'Membro Premium' : undefined}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[#FFD700]/40 blur-sm animate-pulse" />
      {/* Gradient background */}
      <div className="absolute inset-[-2px] rounded-full bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FFD700] opacity-60" />
      <Crown 
        className={cn(
          'relative drop-shadow-lg',
          sizeClasses[size]
        )}
        style={{
          color: '#FFD700',
          fill: 'url(#goldGradient)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
      />
      {/* SVG gradient definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};
