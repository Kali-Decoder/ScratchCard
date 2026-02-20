// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Somnia base reactive handler
import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract MagicChestReactiveGame is SomniaEventHandler {

    // --------------------
    // EVENTS (Game Actions)
    // --------------------
    event ChestOpened(address indexed player, uint256 chestType);
    
    // Debug event to track reactivity execution
    event Reacted(address player, uint256 chestType);

    // --------------------
    // GAME STATE
    // --------------------
    mapping(address => uint256) public coins;
    mapping(address => bool) public hasLegendarySword;

    // Chest types
    uint256 constant COMMON = 1;
    uint256 constant RARE = 2;
    uint256 constant LEGENDARY = 3;
    
    // Event signature for ChestOpened
    bytes32 constant CHEST_SIG = keccak256("ChestOpened(address,uint256)");

    // --------------------
    // PLAYER ACTION
    // --------------------
    function openChest(uint256 chestType) external {
        // Player opens a chest
        emit ChestOpened(msg.sender, chestType);
    }

    // --------------------
    // ON-CHAIN REACTIVITY
    // --------------------
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // MANDATORY: Guard against non-ChestOpened events
        require(eventTopics[0] == CHEST_SIG, "Not ChestOpened");
        
        // Decode event data
        // eventTopics[0] = event signature (ChestOpened)
        // eventTopics[1] = indexed player address
        // data = non-indexed chestType
        
        require(eventTopics.length >= 2, "Invalid event topics");
        
        address player = address(uint160(uint256(eventTopics[1])));
        uint256 chestType = abi.decode(data, (uint256));

        // Game logic reacts automatically
        if (chestType == COMMON) {
            coins[player] += 10;
        } 
        else if (chestType == RARE) {
            coins[player] += 50;
        } 
        else if (chestType == LEGENDARY) {
            hasLegendarySword[player] = true;
        }
        
        // Debug event to track reactivity execution
        emit Reacted(player, chestType);
    }
}
