import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
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
      className="absolute inset-0 flex items-center justify-center bg-[#F9F7F3]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Abstract mirror element */}
        <motion.div 
          className="absolute w-[40vw] h-[60vh] border border-[#1C1917]/20 rounded-full mix-blend-multiply"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        
        <div className="text-center px-12 z-10 max-w-4xl mix-blend-difference">
          <motion.h2 
            className="text-[4.5vw] font-serif text-[#1C1917]"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            The feedback is a mirror.
          </motion.h2>
          
          <motion.p 
            className="text-[2.5vw] font-sans font-light tracking-wide text-[#78716C] mt-8"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            It tells you what your words reveal.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}