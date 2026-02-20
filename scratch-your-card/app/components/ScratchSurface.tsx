"use client";

import { useEffect, useRef, useState } from "react";

interface ScratchSurfaceProps {
  isEnabled: boolean;
  resetKey: number;
  rewardText: string;
  statusText: string;
  onReveal?: () => void;
}

const BRUSH_RADIUS = 22;
const COMPLETE_THRESHOLD = 0.2;
const STROKE_STEP = BRUSH_RADIUS * 0.35;

type Point = { x: number; y: number };

export function ScratchSurface({
  isEnabled,
  resetKey,
  rewardText,
  statusText,
  onReveal,
}: ScratchSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const moveCountRef = useRef(0);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "source-over";

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#d4d4d8");
    gradient.addColorStop(0.5, "#71717a");
    gradient.addColorStop(1, "#d4d4d8");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 12; y < height; y += 20) {
      for (let x = 8; x < width; x += 18) {
        ctx.beginPath();
        ctx.arc(x + ((y / 20) % 2 === 0 ? 0 : 8), y, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 16px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText(isEnabled ? "Scratch here" : "Preparing reward...", width / 2, height / 2);

    setProgress(0);
    setIsRevealed(false);
    setIsPointerDown(false);
    lastPointRef.current = null;
    moveCountRef.current = 0;
  }, [resetKey, isEnabled]);

  const getPoint = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return null;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const eraseAt = (ctx: CanvasRenderingContext2D, point: Point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const scratchStroke = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isRevealed || !isEnabled) return;

    ctx.globalCompositeOperation = "destination-out";

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / STROKE_STEP));

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      eraseAt(ctx, {
        x: from.x + dx * t,
        y: from.y + dy * t,
      });
    }
  };

  const updateProgress = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isRevealed) return;

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;
    let transparent = 0;

    for (let i = 3; i < imageData.length; i += 16) {
      if (imageData[i] === 0) transparent += 1;
    }

    const ratio = transparent / (imageData.length / 16);
    setProgress(ratio);

    if (ratio >= COMPLETE_THRESHOLD) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsRevealed(true);
      setProgress(1);
      onReveal?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[28rem] w-full overflow-hidden rounded-3xl border border-monad-purple/40 bg-gradient-to-b from-card to-black/80 shadow-[0_0_0_1px_rgba(135,109,255,0.18),0_22px_60px_rgba(135,109,255,0.28)] sm:h-[34rem]"
    >
      <div className="pointer-events-none absolute -left-12 -top-10 h-44 w-44 rounded-full bg-monad-purple/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 -bottom-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-gray-300 sm:text-sm">Your Scratch Card</p>
        <h3 className="text-4xl font-black text-white sm:text-5xl">
          {isRevealed ? rewardText : "🎁 Scratch for a surprise!"}
        </h3>
        <p className="mt-4 text-sm text-gray-300 sm:text-base">{statusText}</p>
      </div>

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 touch-none transition-opacity ${
          isRevealed ? "opacity-0 pointer-events-none" : "opacity-100"
        } ${isEnabled ? "cursor-crosshair" : "cursor-not-allowed"}`}
        onPointerDown={(event) => {
          if (!isEnabled) return;
          const point = getPoint(event.clientX, event.clientY);
          if (!point) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsPointerDown(true);
          lastPointRef.current = point;
          scratchStroke(point, point);
          updateProgress();
        }}
        onPointerMove={(event) => {
          if (!isPointerDown || !isEnabled) return;
          const point = getPoint(event.clientX, event.clientY);
          const previous = lastPointRef.current;
          if (!point || !previous) return;
          scratchStroke(previous, point);
          lastPointRef.current = point;

          moveCountRef.current += 1;
          if (moveCountRef.current % 5 === 0) {
            updateProgress();
          }
        }}
        onPointerUp={() => {
          setIsPointerDown(false);
          lastPointRef.current = null;
          updateProgress();
        }}
        onPointerLeave={() => {
          setIsPointerDown(false);
          lastPointRef.current = null;
          updateProgress();
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 border-t border-monad-purple/30 bg-black/55 px-5 py-3 text-sm text-gray-200">
        {isEnabled ? `Scratch progress: ${(progress * 100).toFixed(0)}%` : "Waiting for on-chain settlement..."}
      </div>
    </div>
  );
}
