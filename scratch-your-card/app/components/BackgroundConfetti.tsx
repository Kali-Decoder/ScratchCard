"use client";

import { useMemo } from "react";

type Piece = {
  id: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotate: number;
  color: string;
};

export function BackgroundConfetti() {
  const pieces = useMemo<Piece[]>(() => {
    const colors = ["#876dff", "#22c55e", "#eab308", "#06b6d4", "#f43f5e", "#ffffff"];
    return Array.from({ length: 30 }).map((_, i) => ({
      id: `bg-confetti-${i}`,
      left: Math.random() * 100,
      size: 4 + Math.random() * 8,
      duration: 8 + Math.random() * 9,
      delay: Math.random() * 8,
      drift: (Math.random() - 0.5) * 220,
      rotate: 360 + Math.random() * 1080,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-[-12px] block rounded-sm bg-white/70"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.65}px`,
            backgroundColor: piece.color,
            opacity: 0.35,
            animationName: "bg-confetti-fall",
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "linear",
            ["--bg-drift" as string]: `${piece.drift}px`,
            ["--bg-rot" as string]: `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
