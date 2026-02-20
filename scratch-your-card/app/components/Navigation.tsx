"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { useReactivityStatus } from "../contexts/ReactivityStatusContext";

export function Navigation() {
  const pathname = usePathname();
  const isGame = pathname === "/";
  const isLeaderboard = pathname === "/leaderboard";
  const { status } = useReactivityStatus();
  const isProcessing = status === "processing";

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Image
              src="/scratch-win-sticker-red.svg"
              alt="Scratch & Win"
              width={170}
              height={72}
              className="w-[110px] sm:w-[140px] md:w-[165px]"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                isProcessing
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                  : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isProcessing ? "bg-yellow-300 animate-pulse" : "bg-emerald-300"}`}
              />
              Reactivity: {isProcessing ? "Processing" : "Idle"}
            </div>

            <Link
              href="/"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isGame
                  ? "text-white bg-monad-purple/20 border border-monad-purple/40"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              Game
            </Link>

            <Link
              href="/leaderboard"
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                isLeaderboard
                  ? "bg-monad-purple text-white"
                  : "bg-monad-purple/15 text-monad-purple hover:bg-monad-purple/25"
              }`}
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
