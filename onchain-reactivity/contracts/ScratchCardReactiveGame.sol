// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract ScratchCardReactiveGame is SomniaEventHandler {

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ScratchRequested(address indexed player, uint256 scratchId, uint256 playerNonce);
    event ScratchResolved(address indexed player, uint256 scratchId, uint256 reward, uint256 randomWord);
    event RewardsClaimed(address indexed player, uint256 amount);
    event OwnerWithdraw(address indexed owner, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    address public immutable owner;

    uint256 public scratchPrice = 0.1 ether;   // 0.1 STT
    uint256 private scratchCounter;

    uint256 public totalPendingRewards;

    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public claimedAmount;
    mapping(address => uint256) public totalWonAmount;
    mapping(address => uint256) public totalCardScratches;
    mapping(address => uint256) public playerNonce;

    bytes32 private constant SCRATCH_SIG =
        keccak256("ScratchRequested(address,uint256,uint256)");

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(uint256 _scratchPrice) {
        owner = msg.sender;
        scratchPrice = _scratchPrice;
    }

    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                                GAME
    //////////////////////////////////////////////////////////////*/

    function scratchCard() external payable {
        require(msg.value == scratchPrice, "Wrong scratch price");
        uint256 scratchId = ++scratchCounter;
        uint256 nonce = ++playerNonce[msg.sender];

        emit ScratchRequested(msg.sender, scratchId, nonce);
    }

    function claimRewards(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(amount <= pendingRewards[msg.sender], "Not enough rewards");

        pendingRewards[msg.sender] -= amount;
        claimedAmount[msg.sender] += amount;
        totalPendingRewards -= amount;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Transfer failed");

        emit RewardsClaimed(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        OWNER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function withdrawProfit(uint256 amount) external onlyOwner {
        uint256 available = _availableLiquidity();
        require(amount <= available, "Exceeds available");

        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "Withdraw failed");

        emit OwnerWithdraw(owner, amount);
    }

    function withdrawAllProfit() external onlyOwner {
        uint256 available = _availableLiquidity();
        require(available > 0, "No profit");

        (bool sent, ) = payable(owner).call{value: available}("");
        require(sent, "Withdraw failed");

        emit OwnerWithdraw(owner, available);
    }

    function setScratchPrice(uint256 newPrice) external onlyOwner {
        scratchPrice = newPrice;
    }

    /*//////////////////////////////////////////////////////////////
                        SOMNIA REACTIVITY
    //////////////////////////////////////////////////////////////*/

    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {

        require(emitter == address(this), "Invalid emitter");
        require(eventTopics.length >= 2, "Invalid topics");
        require(eventTopics[0] == SCRATCH_SIG, "Not scratch event");

        address player = address(uint160(uint256(eventTopics[1])));
        (uint256 scratchId, uint256 nonce) = abi.decode(data, (uint256, uint256));

        uint256 randomWord = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    block.number,
                    player,
                    scratchId,
                    nonce,
                    address(this)
                )
            )
        );

        uint256 reward = _rewardFromRandom(randomWord);

        uint256 available = _availableLiquidity();
        if (reward > available) reward = available;

        pendingRewards[player] += reward;
        totalPendingRewards += reward;
        totalWonAmount[player] += reward;
        totalCardScratches[player]++;

        emit ScratchResolved(player, scratchId, reward, randomWord);
    }

    /*//////////////////////////////////////////////////////////////
                        PROFITABLE REWARD MODEL
    //////////////////////////////////////////////////////////////*/

    /**
     Scratch price = 0.1 STT
     RTP ≈ 89%
     House Edge ≈ 11%
    */

    function _rewardFromRandom(uint256 randomWord)
        internal
        view
        returns (uint256)
    {
        uint256 roll = randomWord % 10000;

        if (roll < 5500) return 0;                      // 55%
        if (roll < 7500) return scratchPrice;           // 20% → 0.1
        if (roll < 8500) return scratchPrice * 2;       // 10% → 0.2
        if (roll < 9200) return scratchPrice * 3;       // 7%  → 0.3
        if (roll < 9700) return scratchPrice * 4;       // 5%  → 0.4
        return scratchPrice * 5;                        // 3%  → 0.5
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function getPlayerStats(address player)
        external
        view
        returns (
            uint256 pending,
            uint256 claimed,
            uint256 totalWon,
            uint256 scratches
        )
    {
        return (
            pendingRewards[player],
            claimedAmount[player],
            totalWonAmount[player],
            totalCardScratches[player]
        );
    }

    function _availableLiquidity() internal view returns (uint256) {
        uint256 bal = address(this).balance;
        if (bal <= totalPendingRewards) return 0;
        return bal - totalPendingRewards;
    }
}
