"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import AnimatedNumbers from "react-animated-numbers";
import Image from "next/image";
import {
  AlertTriangle,
  Coins,
  ExternalLink,
  Loader2,
  Network,
  RefreshCw,
  Ticket,
  X,
} from "lucide-react";
import { somniaTestnet } from "./config/chains";
import { SCRATCH_CARD_ABI, SCRATCH_CARD_ADDRESS } from "./config/scratch_game_config";
import { ScratchSurface } from "./components/ScratchSurface";
import { useReactivityStatus } from "./contexts/ReactivityStatusContext";

type PlayerStats = {
  pending: bigint;
  claimed: bigint;
  totalWon: bigint;
  scratches: bigint;
};

type ScratchResult = {
  reward: bigint;
  randomWord?: bigint;
  scratchId?: bigint;
  settledAt: number;
};

type ConfettiPiece = {
  id: string;
  left: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  drift: number;
  rotate: number;
};

type StickerPlacement = {
  id: string;
  src: string;
  top: string;
  left: string;
  rotateDeg: number;
  scale: number;
  width: number;
  height: number;
};

const ZERO_BI = BigInt(0);
const FIVE_BI = BigInt(5);

const ZERO_STATS: PlayerStats = {
  pending: ZERO_BI,
  claimed: ZERO_BI,
  totalWon: ZERO_BI,
  scratches: ZERO_BI,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatEth = (value: bigint, digits = 4) => {
  const eth = Number(ethers.formatEther(value));
  if (!Number.isFinite(eth)) return "0";
  return eth.toFixed(digits);
};

export default function Home() {
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const claimAudioRef = useRef<HTMLAudioElement | null>(null);
  const loseAudioRef = useRef<HTMLAudioElement | null>(null);
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const [scratchPrice, setScratchPrice] = useState<bigint>(ZERO_BI);
  const [contractBalance, setContractBalance] = useState<bigint>(ZERO_BI);
  const [totalPendingRewards, setTotalPendingRewards] = useState<bigint>(ZERO_BI);

  const [stats, setStats] = useState<PlayerStats>(ZERO_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isProcessingReactivity, setIsProcessingReactivity] = useState(false);

  const [lastTxHash, setLastTxHash] = useState("");
  const [lastScratchResult, setLastScratchResult] = useState<ScratchResult | null>(null);
  const [scratchSurfaceKey, setScratchSurfaceKey] = useState(0);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [isScratchRevealed, setIsScratchRevealed] = useState(false);
  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [stickerPlacements, setStickerPlacements] = useState<StickerPlacement[]>([]);
  const { setStatus: setReactivityStatus } = useReactivityStatus();

  const isCorrectNetwork = currentChainId === somniaTestnet.id;
  const canPlay = isConnected && isCorrectNetwork && !isScratching && !isClaiming;

  const availableLiquidity = useMemo(() => {
    if (contractBalance <= totalPendingRewards) return ZERO_BI;
    return contractBalance - totalPendingRewards;
  }, [contractBalance, totalPendingRewards]);

  const maxReward = useMemo(() => {
    return scratchPrice * FIVE_BI;
  }, [scratchPrice]);

  useEffect(() => {
    checkConnection();
    checkNetwork();

    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !account) return;
    refreshAll();

    const interval = setInterval(() => {
      refreshAll();
    }, 6000);

    return () => clearInterval(interval);
  }, [isConnected, account]);

  useEffect(() => {
    setReactivityStatus(isProcessingReactivity ? "processing" : "idle");
    return () => setReactivityStatus("idle");
  }, [isProcessingReactivity, setReactivityStatus]);

  useEffect(() => {
    const slotPool = [
      { top: "6%", left: "70%" },
      { top: "24%", left: "4%" },
      { top: "46%", left: "74%" },
      { top: "68%", left: "8%" },
      { top: "74%", left: "66%" },
    ];

    const shuffledSlots = [...slotPool].sort(() => Math.random() - 0.5);
    const placements: StickerPlacement[] = shuffledSlots.slice(0, 4).map((slot, index) => ({
        id: `floating-sticker-${index}`,
        src: "/scratch-win-sticker.svg",
        width: 220,
        height: 100,
        top: slot.top,
        left: slot.left,
        rotateDeg: -14 + Math.random() * 28,
        scale: 0.68 + Math.random() * 0.36,
      }));

    setStickerPlacements(placements);
  }, []);

  const playWinSound = async () => {
    let audio = winAudioRef.current;
    if (!audio) {
      audio = new Audio("/sounds/horray_fireworks.wav");
      audio.preload = "auto";
      winAudioRef.current = audio;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Ignore if browser blocks playback.
    }
  };

  const playClaimSound = async () => {
    let audio = claimAudioRef.current;
    if (!audio) {
      audio = new Audio("/sounds/cash_register_sfx.wav");
      audio.preload = "auto";
      claimAudioRef.current = audio;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Ignore if browser blocks playback.
    }
  };

  const playLoseSound = async () => {
    let audio = loseAudioRef.current;
    if (!audio) {
      audio = new Audio("/sounds/oh_no.wav");
      audio.preload = "auto";
      loseAudioRef.current = audio;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Ignore if browser blocks playback.
    }
  };

  const checkConnection = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;

    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to check wallet connection:", error);
    }
  };

  const checkNetwork = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setCurrentChainId(null);
      return;
    }

    try {
      const chainId = await (window as any).ethereum.request({ method: "eth_chainId" });
      setCurrentChainId(parseInt(chainId, 16));
    } catch (error) {
      console.error("Failed to check network:", error);
      setCurrentChainId(null);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsConnected(true);
    } else {
      setAccount("");
      setIsConnected(false);
      setStats(ZERO_STATS);
    }
  };

  const handleChainChanged = () => {
    checkNetwork();
    setTimeout(() => window.location.reload(), 450);
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install a wallet like MetaMask.");
      return;
    }

    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      setIsConnected(true);
      await ensureSomniaNetwork();
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      showNotification("error", error?.message || "Wallet connection failed");
    }
  };

  const ensureSomniaNetwork = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const chainIdHex = `0x${somniaTestnet.id.toString(16)}`;

    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError?.code !== 4902) throw switchError;

      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: somniaTestnet.name,
            nativeCurrency: somniaTestnet.nativeCurrency,
            rpcUrls: somniaTestnet.rpcUrls.default.http,
            blockExplorerUrls: somniaTestnet.blockExplorers?.default
              ? [somniaTestnet.blockExplorers.default.url]
              : undefined,
          },
        ],
      });
    }

    await wait(900);
    await checkNetwork();
  };

  const switchToSomniaTestnet = async () => {
    try {
      setIsSwitchingNetwork(true);
      await ensureSomniaNetwork();
    } catch (error: any) {
      showNotification("error", error?.message || "Failed to switch network");
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const getProvider = () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("Wallet provider not found");
    }
    return new ethers.BrowserProvider((window as any).ethereum);
  };

  const logTransaction = async ({
    txHash,
    action,
    amountWei,
  }: {
    txHash: string;
    action: "scratch_reward" | "claim";
    amountWei: bigint;
  }) => {
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          txHash,
          action,
          amountWei: amountWei.toString(),
          chainId: somniaTestnet.id,
          contractAddress: SCRATCH_CARD_ADDRESS,
          occurredAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn("Transaction logging failed:", error);
    }
  };

  const refreshAll = async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      const provider = getProvider();
      const code = await provider.getCode(SCRATCH_CARD_ADDRESS);

      if (code === "0x") {
        throw new Error(
          "Scratch contract not found at configured address. Set NEXT_PUBLIC_SCRATCH_CARD_CONTRACT."
        );
      }

      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, provider);

      const [price, pendingTotal, balance, pending, playerStats] = await Promise.all([
        contract.scratchPrice(),
        contract.totalPendingRewards(),
        provider.getBalance(SCRATCH_CARD_ADDRESS),
        contract.pendingRewards(account),
        contract.getPlayerStats(account),
      ]);

      setScratchPrice(BigInt(price));
      setTotalPendingRewards(BigInt(pendingTotal));
      setContractBalance(BigInt(balance));
      setStats({
        pending: BigInt(pending),
        claimed: BigInt(playerStats[1]),
        totalWon: BigInt(playerStats[2]),
        scratches: BigInt(playerStats[3]),
      });
    } catch (error: any) {
      console.error("Failed to fetch game state:", error);
      showNotification("error", error?.message || "Failed to fetch game data");
    } finally {
      setIsLoading(false);
    }
  };

  const waitForScratchResolution = async (
    contract: ethers.Contract,
    provider: ethers.BrowserProvider,
    fromBlock: bigint,
    pendingBefore: bigint
  ): Promise<ScratchResult | null> => {
    for (let i = 0; i < 24; i++) {
      const latestBlock = await provider.getBlockNumber();
      const events = await contract.queryFilter(contract.filters.ScratchResolved(account), fromBlock, latestBlock);

      if (events.length > 0) {
        const latest = events[events.length - 1];
        if (!("args" in latest)) {
          await wait(2500);
          continue;
        }

        const parsed = latest.args as {
          reward?: bigint;
          randomWord?: bigint;
          scratchId?: bigint;
        };
        return {
          reward: BigInt(parsed?.reward ?? 0),
          randomWord: parsed?.randomWord ? BigInt(parsed.randomWord) : undefined,
          scratchId: parsed?.scratchId ? BigInt(parsed.scratchId) : undefined,
          settledAt: Date.now(),
        };
      }

      const pendingNow = BigInt(await contract.pendingRewards(account));
      if (pendingNow > pendingBefore) {
        return {
          reward: pendingNow - pendingBefore,
          settledAt: Date.now(),
        };
      }

      await wait(2500);
    }

    return null;
  };

  const scratchCard = async () => {
    if (!canPlay) {
      showNotification("error", "Connect wallet on Somnia Testnet first");
      return;
    }

    try {
      setIsScratching(true);
      setIsProcessingReactivity(true);

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, signer);

      const price = BigInt(await contract.scratchPrice());
      const pendingBefore = BigInt(await contract.pendingRewards(account));

      const tx = await contract.scratchCard({ value: price });
      setShowScratchCard(true);
      setIsScratchRevealed(false);
      setIsScratchModalOpen(true);
      setLastTxHash(tx.hash);
      const receipt = await tx.wait();

      const result = await waitForScratchResolution(
        contract,
        provider,
        BigInt(receipt.blockNumber),
        pendingBefore
      );

      if (result) {
        setLastScratchResult(result);
        setScratchSurfaceKey((v) => v + 1);
        await logTransaction({
          txHash: tx.hash,
          action: "scratch_reward",
          amountWei: result.reward,
        });
        showNotification("success", "Reward settled. Scratch card to reveal your STT winnings.");
      } else {
        showNotification("error", "Scratch tx confirmed, but reactive result is still pending");
      }

      await refreshAll();
    } catch (error: any) {
      console.error("Scratch failed:", error);
      showNotification("error", error?.shortMessage || error?.message || "Scratch transaction failed");
    } finally {
      setIsScratching(false);
      setIsProcessingReactivity(false);
    }
  };

  const claimRewards = async () => {
    if (!canPlay) {
      showNotification("error", "Connect wallet on Somnia Testnet first");
      return;
    }

    try {
      setIsClaiming(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, signer);

      const claimAmount = BigInt(await contract.pendingRewards(account));
      if (claimAmount === ZERO_BI) {
        showNotification("error", "No pending rewards to claim");
        await refreshAll();
        return;
      }

      const tx = await contract.claimRewards(claimAmount);
      setLastTxHash(tx.hash);
      await tx.wait();

      await logTransaction({
        txHash: tx.hash,
        action: "claim",
        amountWei: claimAmount,
      });

      void playClaimSound();
      showNotification("success", `Claimed ${formatEth(claimAmount)} STT`);
      await refreshAll();
    } catch (error: any) {
      console.error("Claim failed:", error);
      showNotification("error", error?.shortMessage || error?.message || "Claim failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    const div = document.createElement("div");
    div.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg backdrop-blur-sm animate-fade-in ${
      type === "success"
        ? "bg-green-500/10 border border-green-500/30 text-green-500"
        : "bg-red-500/10 border border-red-500/30 text-red-500"
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  };

  const burstConfetti = () => {
    const colors = ["#876dff", "#22c55e", "#eab308", "#06b6d4", "#f43f5e", "#ffffff"];
    const now = Date.now();
    const pieces: ConfettiPiece[] = Array.from({ length: 90 }).map((_, index) => ({
      id: `${now}-${index}`,
      left: Math.random() * 100,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.15,
      duration: 1.6 + Math.random() * 1.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      drift: (Math.random() - 0.5) * 160,
      rotate: Math.random() * 720,
    }));

    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {stickerPlacements.map((sticker) => (
          <div
            key={sticker.id}
            className="pointer-events-none absolute -z-10 hidden opacity-80 md:block"
            style={{
              top: sticker.top,
              left: sticker.left,
              transform: `rotate(${sticker.rotateDeg}deg) scale(${sticker.scale})`,
            }}
          >
            <Image
              src={sticker.src}
              alt="Scratch and Win"
              width={sticker.width}
              height={sticker.height}
              className="drop-shadow-[0_10px_30px_rgba(135,109,255,0.28)]"
            />
          </div>
        ))}

        {isConnected && !isCorrectNetwork && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-yellow-500">Wrong Network Detected</h3>
                  <p className="text-xs text-gray-400">
                    Switch to Somnia Testnet (Chain ID: {somniaTestnet.id}).
                    {currentChainId ? <span className="ml-1">Current: {currentChainId}</span> : null}
                  </p>
                </div>
              </div>
              <button
                onClick={switchToSomniaTestnet}
                disabled={isSwitchingNetwork}
                className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Network className={`h-4 w-4 ${isSwitchingNetwork ? "animate-spin" : ""}`} />
                {isSwitchingNetwork ? "Switching..." : "Switch to Somnia"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-3 bg-gradient-to-r from-monad-purple to-purple-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
              Scratch Card Reactive Game
            </h1>
            <p className="max-w-2xl text-sm text-gray-400 sm:text-base">
              Scratch once, emit `ScratchRequested`, then Somnia reactivity settles rewards on-chain through
              `ScratchResolved`. Claim your pending STT whenever you want.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="whitespace-nowrap rounded-lg bg-monad-purple px-6 py-3 font-medium text-white transition-all hover:bg-monad-purple/90"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-card-border bg-card px-4 py-2">
                  <p className="text-xs text-gray-400">Connected</p>
                  <p className="font-mono text-sm text-monad-purple">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={refreshAll}
                  disabled={isLoading}
                  className="rounded-lg bg-monad-purple/10 p-3 text-monad-purple transition-colors hover:bg-monad-purple/20 disabled:opacity-60"
                  title="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            label="Scratch Price"
            value={Number(formatEth(scratchPrice))}
            suffix=" STT"
            icon={<Ticket className="h-5 w-5" />}
          />
          <MetricCard
            label="Max Reward (5x)"
            value={Number(formatEth(maxReward))}
            suffix=" STT"
            icon={<Coins className="h-5 w-5" />}
          />
          <MetricCard
            label="Available Liquidity"
            value={Number(formatEth(availableLiquidity))}
            suffix=" STT"
            icon={<Coins className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending to Claim"
            value={Number(formatEth(stats.pending))}
            suffix=" STT"
            icon={<Coins className="h-5 w-5" />}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-2 text-xl font-bold text-white">Scratch Action</h2>
            <p className="mb-6 text-sm text-gray-400">
              Buy one scratch card and wait for the reactive settlement to update your pending reward.
            </p>

            <button
              onClick={scratchCard}
              disabled={!canPlay}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-monad-purple px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-monad-purple/90 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {isScratching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              {isScratching ? "Submitting Scratch..." : `Scratch for ${formatEth(scratchPrice)} STT`}
            </button>

            <button
              onClick={claimRewards}
              disabled={!canPlay || stats.pending === ZERO_BI}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              {isClaiming ? "Claiming..." : stats.pending > ZERO_BI ? `Claim ${formatEth(stats.pending)} STT` : "Claim Rewards"}
            </button>

            {isProcessingReactivity ? (
              <div className="mt-6 rounded-lg border border-yellow-500/35 bg-yellow-500/10 p-4 text-xs text-yellow-200">
                Waiting for `ScratchResolved` reactive settlement...
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Scratch Reveal</h2>
            {!showScratchCard ? (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-card-border bg-black/30 px-6 text-center text-sm text-gray-400">
                Sign a scratch transaction to open your scratch card modal.
              </div>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-card-border bg-black/30 px-6 text-center">
                <p className="mb-3 text-sm text-gray-300">
                  {isScratchRevealed
                    ? "Reward already revealed for latest card."
                    : "Your scratch card is ready in modal."}
                </p>
                <button
                  onClick={() => setIsScratchModalOpen(true)}
                  className="rounded-lg bg-monad-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-monad-purple/90"
                >
                  Open Scratch Card
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Total Scratches" value={Number(stats.scratches)} />
          <MetricCard label="Total Won" value={Number(formatEth(stats.totalWon))} suffix=" STT" />
          <MetricCard label="Total Claimed" value={Number(formatEth(stats.claimed))} suffix=" STT" />
          <MetricCard label="Still Pending" value={Number(formatEth(stats.pending))} suffix=" STT" />
        </div>

        <div className="rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-sm font-medium text-white">Somnia Testnet</p>
              <p className="text-xs text-gray-400">Contract: {SCRATCH_CARD_ADDRESS}</p>
            </div>
            <a
              href={`https://shannon-explorer.somnia.network/address/${SCRATCH_CARD_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-monad-purple transition-colors hover:text-monad-purple/80"
            >
              View Contract <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          {lastTxHash ? (
            <a
              href={`https://shannon-explorer.somnia.network/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-xs text-gray-300 underline-offset-4 hover:underline"
            >
              Last tx: {lastTxHash.slice(0, 12)}...{lastTxHash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        {showScratchCard && isScratchModalOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-card-border bg-black p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Scratch Reveal</h3>
                <button
                  onClick={() => setIsScratchModalOpen(false)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close scratch modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ScratchSurface
                isEnabled={!!lastScratchResult}
                resetKey={scratchSurfaceKey}
                rewardText={
                  lastScratchResult
                    ? lastScratchResult.reward === ZERO_BI
                      ? "😢 Better luck next time! 0 STT"
                      : `You won ${formatEth(lastScratchResult.reward)} STT`
                    : "Processing..."
                }
                statusText={
                  isScratchRevealed
                    ? "Reward revealed successfully"
                    : lastScratchResult
                    ? "Scratch to reveal your won amount"
                    : "Transaction signed. Waiting for settlement..."
                }
                onReveal={() => {
                  setIsScratchRevealed(true);
                  burstConfetti();
                  if (lastScratchResult) {
                    if (lastScratchResult.reward === ZERO_BI) {
                      void playLoseSound();
                      showNotification("error", "😢 You got 0 STT this time.");
                    } else {
                      void playWinSound();
                      showNotification("success", `You won ${formatEth(lastScratchResult.reward)} STT`);
                    }
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        {confettiPieces.length > 0 ? (
          <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="absolute top-[-10px] block rounded-sm"
                style={{
                  left: `${piece.left}%`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 0.6}px`,
                  backgroundColor: piece.color,
                  animationName: "confetti-fall",
                  animationDuration: `${piece.duration}s`,
                  animationDelay: `${piece.delay}s`,
                  animationTimingFunction: "ease-out",
                  animationFillMode: "forwards",
                  transform: `translate3d(0,0,0) rotate(0deg)`,
                  ["--drift" as string]: `${piece.drift}px`,
                  ["--rot" as string]: `${piece.rotate}deg`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-6">
      <p className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-300">
        {icon}
        {label}
      </p>
      <div className="flex items-end gap-2 text-2xl font-semibold text-white sm:text-3xl">
        <AnimatedNumbers
          animateToNumber={Number.isFinite(value) ? value : 0}
          includeComma
          transitions={(index) => ({
            type: "spring",
            duration: index + 0.3,
          })}
          fontStyle={{
            fontSize: 34,
            fontWeight: 700,
            color: "rgb(255,255,255)",
          }}
        />
        {suffix ? <span className="mb-1 text-base text-gray-300">{suffix}</span> : null}
      </div>
    </div>
  );
}
