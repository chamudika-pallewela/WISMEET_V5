'use client';
import { motion } from 'framer-motion';

type Props = {
  active: boolean;
  onToggle: () => void;
};

export default function TranscriptionToggle({ active, onToggle }: Props) {
  return (
    <motion.button
      onClick={onToggle}
      className={`relative overflow-hidden rounded-md px-6 py-2 h-10 font-medium transition-all duration-300 ${
        active 
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={active ? { 
        boxShadow: [
          '0 0 0 0 rgba(34, 197, 94, 0.4)',
          '0 0 0 10px rgba(34, 197, 94, 0)',
          '0 0 0 0 rgba(34, 197, 94, 0)'
        ]
      } : {}}
      transition={{ 
        boxShadow: { 
          duration: 1.5, 
          repeat: active ? Infinity : 0,
          ease: "easeInOut"
        }
      }}
    >
      <motion.div
        className="flex items-center gap-2"
        animate={active ? { 
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ 
          duration: 2, 
          repeat: active ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <motion.div
          className={`w-2 h-2 rounded-full ${
            active ? 'bg-white' : 'bg-gray-500'
          }`}
          animate={active ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          } : {}}
          transition={{
            duration: 1.5,
            repeat: active ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        <span className="text-sm font-semibold">
          {active ? 'Transcription ON' : 'Transcription OFF'}
        </span>
      </motion.div>
      
      {active && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
}
