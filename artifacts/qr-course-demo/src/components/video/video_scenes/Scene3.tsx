import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1 }}
    >
      <div className="text-center px-16 max-w-5xl">
        <motion.div 
          className="text-[8vw] font-serif italic text-[#D6D3D1] mb-2 leading-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          29
        </motion.div>
        
        <motion.h3 
          className="text-[3vw] font-serif text-[#1C1917] tracking-wide mb-8"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          SHORT LECTURES
        </motion.h3>

        <motion.div 
          className="h-[1px] w-24 bg-[#1C1917]/20 mx-auto my-8"
          initial={{ width: 0 }}
          animate={phase >= 2 ? { width: 96 } : { width: 0 }}
          transition={{ duration: 0.8 }}
        />

        <motion.p 
          className="text-[3vw] font-serif text-[#78716C]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          One honest question at a time.
        </motion.p>
      </div>
    </motion.div>
  );
}