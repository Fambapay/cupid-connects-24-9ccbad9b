import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface PromptCardProps {
  question: string;
  answer: string;
  /** Card height — match the photo card height in the swipe stack */
  height?: string;
}

/**
 * Hinge-style prompt card shown intercalated between photos in the discovery swipe.
 * Solid black background, prominent answer, small question label.
 */
export const PromptCard = ({ question, answer, height = '72vh' }: PromptCardProps) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-center px-7 py-10"
      style={{
        height,
        background: '#0a0a0a',
      }}
    >
      {/* Quote icon */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <Quote
          className="w-7 h-7"
          style={{ color: '#FF4FA3', transform: 'scaleX(-1)' }}
          strokeWidth={2.2}
        />
      </motion.div>

      {/* Question */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="text-[14px] font-medium uppercase tracking-[0.08em] mb-4"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {question}
      </motion.p>

      {/* Answer — large, bold, the focal point */}
      <motion.h3
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-white font-bold leading-[1.2]"
        style={{
          fontSize: 'clamp(24px, 5.5vw, 30px)',
          letterSpacing: '-0.01em',
        }}
      >
        {answer}
      </motion.h3>
    </div>
  );
};