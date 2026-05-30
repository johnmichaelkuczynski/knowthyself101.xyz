import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useState, useEffect, useRef } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS = {
  s1: 5200,
  s2: 5000,
  s3: 5000,
  s4: 5000,
  s5: 5000,
  s6: 6000,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  s1: Scene1,
  s2: Scene2,
  s3: Scene3,
  s4: Scene4,
  s5: Scene5,
  s6: Scene6,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  // Keep the pre-mixed narration+music track aligned with the visible scene
  // for normal looping, scene jumps, and scene-lock _r1 / _r2 replays.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);


  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#F9F7F3] text-[#1C1917]">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full blur-[100px] opacity-30 mix-blend-multiply"
          style={{ background: 'radial-gradient(circle, #E7E5E4, transparent)' }}
          animate={{
            x: ['-20%', '20%', '-10%'],
            y: ['-10%', '30%', '10%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[80px] opacity-20 mix-blend-multiply right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #D6D3D1, transparent)' }}
          animate={{
            x: ['20%', '-20%', '10%'],
            y: ['20%', '-10%', '20%'],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <AnimatePresence mode="sync">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}