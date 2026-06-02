import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const dimensions = { sm: 16, md: 20, lg: 24 } as const;

export const VerifiedBadge = ({ size = 'md', className, showTooltip = false }: VerifiedBadgeProps) => {
  const d = dimensions[size];
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      style={{ width: d, height: d }}
      title={showTooltip ? 'Perfil verificado' : undefined}
    >
      <svg width={d} height={d} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 1.5l2.4 1.9 3 -.4 1.5 2.6 2.6 1.5 -.4 3 1.9 2.4 -1.9 2.4 .4 3 -2.6 1.5 -1.5 2.6 -3 -.4 -2.4 1.9 -2.4 -1.9 -3 .4 -1.5 -2.6 -2.6 -1.5 .4 -3 -1.9 -2.4 1.9 -2.4 -.4 -3 2.6 -1.5 1.5 -2.6 3 .4z"
          fill="#3B9FE7"
        />
        <path d="M8 12.4l2.6 2.6L16 9.6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </motion.div>
  );
};
