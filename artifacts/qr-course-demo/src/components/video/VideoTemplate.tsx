import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useState, useEffect, useRef } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

// @ts-ignore
import narrationUrl from "../../../../../attached_assets/generated_audio/know_thyself_narration.mp3";
// @ts-ignore
import musicUrl from "../../../../../attached_assets/generated_audio/know_thyself_music.mp3";

export const SCENE_DURATIONS = {
  s1: 5200,
  s2: 5000,
  s3: 5000,
  s4: 5000,
  s5: 5000,
  s6: 6000,
};

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
  const { currentSceneKey, currentScene } = useVideoPlayer({ durations, loop });
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = 0.22;
      musicRef.current.play().catch(() => {});
    }
  }, []);

  // When video loops (currentScene goes back to 0), reset narration audio
  useEffect(() => {
    if (currentScene === 0 && narrationRef.current) {
      narrationRef.current.currentTime = 0;
      narrationRef.current.play().catch(() => {});
    }
  }, [currentScene]);


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
        ref={narrationRef}
        src={narrationUrl}
        preload="auto"
        autoPlay
        muted={muted}
      />
      <audio
        ref={musicRef}
        src={musicUrl}
        preload="auto"
        autoPlay
        loop
        muted={muted}
      />
    </div>
  );
}