"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Loader2, Rocket, Settings, Shield, Trophy, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { useReactivityStatus } from "../contexts/ReactivityStatusContext";
import { useToastContext } from "../contexts/ToastContext";
import { SCRATCH_CARD_ABI, SCRATCH_CARD_ADDRESS } from "../config/scratch_game_config";
import { runAdminBatchAction } from "@/app/actions/admin-batch-scratch.action";

export function Navigation() {
  const pathname = usePathname();
  const isGame = pathname === "/";
  const isLeaderboard = pathname === "/leaderboard";
  const { status } = useReactivityStatus();
  const isProcessing = status === "processing";
  const { showError, showSuccess } = useToastContext();

  const [account, setAccount] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [isWithdrawingAll, setIsWithdrawingAll] = useState(false);
  const [isSettingPrice, setIsSettingPrice] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  const normalizedAccount = useMemo(() => account.toLowerCase(), [account]);
  const normalizedOwner = useMemo(() => ownerAddress.toLowerCase(), [ownerAddress]);
  const isOwner = normalizedAccount !== "" && normalizedAccount === normalizedOwner;

  const getProvider = () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("Wallet provider not found");
    }
    return new ethers.BrowserProvider((window as any).ethereum);
  };

  const syncAccount = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setAccount("");
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
      setAccount(accounts?.[0] ?? "");
    } catch {
      setAccount("");
    }
  }, []);

  const syncOwner = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setOwnerAddress("");
      return;
    }

    try {
      setIsCheckingOwner(true);
      const provider = getProvider();
      const code = await provider.getCode(SCRATCH_CARD_ADDRESS);
      if (code === "0x") {
        setOwnerAddress("");
        return;
      }

      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, provider);
      const owner = await contract.owner();
      setOwnerAddress(String(owner));
    } catch {
      setOwnerAddress("");
    } finally {
      setIsCheckingOwner(false);
    }
  }, []);

  useEffect(() => {
    syncAccount();
    syncOwner();

    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;
    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts?.[0] ?? "");
    const handleChainChanged = () => {
      syncAccount();
      syncOwner();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [syncAccount, syncOwner]);

  const withdrawAllProfit = async () => {
    if (!isOwner) {
      showError("Admin action blocked: connected wallet is not contract owner");
      return;
    }

    try {
      setIsWithdrawingAll(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, signer);
      const tx = await contract.withdrawAllProfit();
      await tx.wait();
      showSuccess("Withdraw all profit completed");
    } catch (error: any) {
      showError(error?.shortMessage || error?.message || "Withdraw failed");
    } finally {
      setIsWithdrawingAll(false);
    }
  };

  const updateScratchPrice = async () => {
    if (!isOwner) {
      showError("Admin action blocked: connected wallet is not contract owner");
      return;
    }

    const input = window.prompt("Set new scratch price in STT (example: 0.1)");
    if (!input) return;

    try {
      const wei = ethers.parseEther(input.trim());
      if (wei <= BigInt(0)) {
        showError("Price must be greater than 0");
        return;
      }

      setIsSettingPrice(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SCRATCH_CARD_ADDRESS, SCRATCH_CARD_ABI, signer);
      const tx = await contract.setScratchPrice(wei);
      await tx.wait();
      showSuccess(`Scratch price updated to ${input} STT`);
    } catch (error: any) {
      showError(error?.shortMessage || error?.message || "Failed to update scratch price");
    } finally {
      setIsSettingPrice(false);
    }
  };

  const runAdminBatch = async () => {
    if (!isOwner) {
      showError("Admin action blocked: connected wallet is not contract owner");
      return;
    }

    const walletInput = window.prompt("Batch wallet count (default: 10)", "10");
    if (walletInput === null) return;

    const roundsInput = window.prompt("Max rounds per wallet (default: 10)", "10");
    if (roundsInput === null) return;

    const walletCount = Number(walletInput.trim() || "10");
    const maxRoundsPerWallet = Number(roundsInput.trim() || "10");
    const options = {
      walletCount,
      maxRoundsPerWallet,
      reactivityPolls: 20,
      reactivityPollMs: 2000,
      saveWallets: false,
    };

    if (!Number.isInteger(walletCount) || walletCount <= 0) {
      showError("Wallet count must be a positive integer");
      return;
    }

    if (!Number.isInteger(maxRoundsPerWallet) || maxRoundsPerWallet <= 0) {
      showError("Max rounds must be a positive integer");
      return;
    }

    try {
      setIsRunningBatch(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const requester = (await signer.getAddress()).toLowerCase();
      const requestedAt = Date.now();
      const message = [
        "scratch-your-card admin batch run",
        `requester:${requester}`,
        `requestedAt:${requestedAt}`,
        `walletCount:${options.walletCount}`,
        `maxRoundsPerWallet:${options.maxRoundsPerWallet}`,
        `reactivityPolls:${options.reactivityPolls}`,
        `reactivityPollMs:${options.reactivityPollMs}`,
        `saveWallets:${options.saveWallets}`,
        `contract:${SCRATCH_CARD_ADDRESS.toLowerCase()}`,
      ].join("\n");
      const signature = await signer.signMessage(message);

      const json = await runAdminBatchAction({
        requester,
        requestedAt,
        signature,
        options,
      });
      if (!json?.ok) {
        throw new Error(json?.error || "Batch run failed");
      }

      showSuccess(
        `Batch run complete: scratches=${json.result.totalScratches}, wallets=${json.result.walletCount}`
      );
    } catch (error: any) {
      showError(error?.shortMessage || error?.message || "Failed to run admin batch");
    } finally {
      setIsRunningBatch(false);
    }
  };

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
            {isCheckingOwner && account ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-2 py-1 text-[11px] text-gray-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking owner...
              </div>
            ) : null}

            {isOwner ? (
              <>
                <button
                  onClick={updateScratchPrice}
                  disabled={isSettingPrice}
                  className="inline-flex items-center gap-2 rounded-lg border border-monad-purple/40 bg-monad-purple/15 px-3 py-2 text-xs font-semibold text-monad-purple transition-colors hover:bg-monad-purple/25 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Owner-only: update scratch price"
                >
                  {isSettingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
                  Set Price
                </button>
                <button
                  onClick={withdrawAllProfit}
                  disabled={isWithdrawingAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Owner-only: withdraw all available profit"
                >
                  {isWithdrawingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
                  Withdraw Profit
                </button>
                <button
                  onClick={runAdminBatch}
                  disabled={isRunningBatch}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Owner-only: run backend batch scratch script and save txs to MongoDB"
                >
                  {isRunningBatch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                  Run Batch
                </button>
                <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                  <Shield className="h-3 w-3" />
                  Admin
                </div>
              </>
            ) : null}

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
