export const SCRATCH_CARD_ADDRESS =
  process.env.NEXT_PUBLIC_SCRATCH_CARD_CONTRACT ??
  "0x14c1386e45401Fbbed5af46E67E7B602C519E972";

export const SCRATCH_CARD_ABI = [
  "function scratchPrice() view returns (uint256)",
  "function totalPendingRewards() view returns (uint256)",
  "function scratchCard() payable",
  "function claimRewards(uint256 amount)",
  "function pendingRewards(address) view returns (uint256)",
  "function getPlayerStats(address) view returns (uint256 pending,uint256 claimed,uint256 totalWon,uint256 scratches)",
  "event ScratchRequested(address indexed player,uint256 scratchId,uint256 playerNonce)",
  "event ScratchResolved(address indexed player,uint256 scratchId,uint256 reward,uint256 randomWord)",
  "event RewardsClaimed(address indexed player,uint256 amount)",
] as const;
