import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1300),
      setTimeout(() => setPhase(3), 2900),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full max-w-5xl px-12 flex flex-col items-center text-center">
        {/* Above the line: the visible self */}
        <motion.h1
          className="text-[4.2vw] font-serif text-[#1C1917] leading-tight"
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Most of what runs a life
        </motion.h1>

        <motion.h1
          className="text-[4.2vw] font-serif italic text-[#1C1917] leading-tight"
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          runs quietly
        </motion.h1>

        {/* The threshold of awareness */}
        <motion.div
          className="my-[3vh] h-[1px] bg-[#1C1917]/30"
          initial={{ width: 0 }}
          animate={{ width: phase >= 2 ? '55%' : 0 }}
          transition={{ duration: 1.1, ease: 'anticipate' }}
        />

        {/* Below the line: the unconscious, dimmer and drifting up */}
        <motion.p
          className="text-[2.2vw] font-sans font-light text-[#78716C]"
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={phase >= 3
            ? { opacity: 1, y: 0, filter: 'blur(0px)' }
            : { opacity: 0, y: 18, filter: 'blur(6px)' }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          just below awareness
        </motion.p>
      </div>
    </motion.div>
  );
}
