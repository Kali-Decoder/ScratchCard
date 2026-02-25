"use client";

import { useEffect, useRef } from "react";

export function GlobalClickSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const playClickSound = async () => {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio("/sounds/Banner.wav");
        audio.preload = "auto";
        audioRef.current = audio;
      }

      try {
        audio.currentTime = 0;
        await audio.play();
      } catch {
        // Ignore playback errors (for example, browser restrictions).
      }
    };

    document.addEventListener("pointerdown", playClickSound);
    return () => {
      document.removeEventListener("pointerdown", playClickSound);
    };
  }, []);

  return null;
}
