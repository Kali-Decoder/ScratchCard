import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("ScratchCardReactiveGame.claimRewards", function () {
  async function deployFixture() {
    const [owner, player] = await hre.ethers.getSigners();
    const price = hre.ethers.parseEther("0.1");

    const Harness = await hre.ethers.getContractFactory("ScratchCardGameTestHarness");
    const game = await Harness.deploy(price);

    return { owner, player, game, price };
  }

  it("reverts when amount is zero", async function () {
    const { game, player } = await loadFixture(deployFixture);

    await expect(game.connect(player).claimRewards(0)).to.be.revertedWith("Zero amount");
  });

  it("reverts when claim is greater than pending", async function () {
    const { game, player } = await loadFixture(deployFixture);
    const pending = hre.ethers.parseEther("0.2");

    await game.seedPending(player.address, pending);

    await expect(game.connect(player).claimRewards(pending + 1n)).to.be.revertedWith(
      "Not enough rewards"
    );
  });

  it("claims a partial amount and updates accounting correctly", async function () {
    const { game, owner, player } = await loadFixture(deployFixture);
    const pending = hre.ethers.parseEther("0.4");
    const claimAmount = hre.ethers.parseEther("0.1");

    await owner.sendTransaction({ to: game.target, value: hre.ethers.parseEther("1") });
    await game.seedPending(player.address, pending);

    await expect(game.connect(player).claimRewards(claimAmount))
      .to.emit(game, "RewardsClaimed")
      .withArgs(player.address, claimAmount);

    expect(await game.pendingRewards(player.address)).to.equal(pending - claimAmount);
    expect(await game.claimedAmount(player.address)).to.equal(claimAmount);
    expect(await game.totalPendingRewards()).to.equal(pending - claimAmount);
  });

  it("allows full claim and leaves no pending rewards", async function () {
    const { game, owner, player } = await loadFixture(deployFixture);
    const pending = hre.ethers.parseEther("0.25");

    await owner.sendTransaction({ to: game.target, value: hre.ethers.parseEther("1") });
    await game.seedPending(player.address, pending);

    await game.connect(player).claimRewards(pending);

    expect(await game.pendingRewards(player.address)).to.equal(0);
    expect(await game.claimedAmount(player.address)).to.equal(pending);
    expect(await game.totalPendingRewards()).to.equal(0);
  });

  it("reverts and preserves state when transfer fails due to low balance", async function () {
    const { game, player } = await loadFixture(deployFixture);
    const pending = hre.ethers.parseEther("0.3");

    await game.seedPending(player.address, pending);

    await expect(game.connect(player).claimRewards(pending)).to.be.revertedWith("Transfer failed");

    expect(await game.pendingRewards(player.address)).to.equal(pending);
    expect(await game.claimedAmount(player.address)).to.equal(0);
    expect(await game.totalPendingRewards()).to.equal(pending);
  });
});
