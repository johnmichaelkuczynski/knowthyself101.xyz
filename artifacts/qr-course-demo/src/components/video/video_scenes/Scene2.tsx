import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <div className="relative w-full max-w-4xl px-12">
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] bg-[#1C1917]"
          initial={{ height: 0 }}
          animate={{ height: phase >= 1 ? '100%' : 0 }}
          transition={{ duration: 0.8, ease: "anticipate" }}
        />
        
        <div className="pl-12">
          <motion.h2 
            className="text-[4vw] font-serif text-[#1C1917] leading-none mb-4"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            Know Thyself
          </motion.h2>
          
          <motion.p 
            className="text-[2.5vw] font-sans text-[#78716C] font-light"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          >
            is a four-week course whose subject is you.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}