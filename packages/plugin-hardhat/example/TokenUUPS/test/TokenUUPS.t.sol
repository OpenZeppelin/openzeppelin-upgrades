// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Upgrades} from "@openzeppelin/foundry-upgrades/src/Upgrades.sol";
import {TokenV1} from "../contracts/TokenV1.sol";
import {TokenV2} from "../contracts/TokenV2.sol";

/**
 * @title TokenUUPSTest
 * @dev Foundry tests for the UUPS upgrade workflow: Ownable → AccessControl
 * 
 * These tests demonstrate:
 * 1. Deploying V1 with Ownable and UUPS
 * 2. Upgrading to V2 with AccessControl and UUPS
 * 3. State preservation during upgrade
 * 4. Access control functionality after upgrade
 */
contract TokenUUPSTest is Test {
    address public owner;
    address public user;
    address public nonMinter;
    address public proxy;
    TokenV1 public tokenV1;
    TokenV2 public tokenV2;

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        nonMinter = makeAddr("nonMinter");
    }

    /**
     * @dev Test deploying V1, upgrading to V2, and preserving state
     */
    function test_DeployUpgradeAndPreserveState() public {
        // Deploy V1 with Ownable and UUPS
        bytes memory initData = abi.encodeCall(TokenV1.initialize, (owner));
        proxy = Upgrades.deployUUPSProxy("contracts/TokenV1.sol:TokenV1", initData);
        tokenV1 = TokenV1(proxy);

        // Verify V1 functionality
        assertEq(tokenV1.owner(), owner);

        // Mint some tokens in V1 to verify state preservation
        uint256 mintAmount = 1000 ether;
        tokenV1.mint(user, mintAmount);
        assertEq(tokenV1.balanceOf(user), mintAmount);

        // Upgrade to V2 with migration
        bytes memory migrateData = abi.encodeCall(TokenV2.migrateFromV1, (owner));
        Upgrades.upgradeProxy(proxy, "contracts/TokenV2.sol:TokenV2", migrateData, owner);
        tokenV2 = TokenV2(proxy);

        // Verify state is preserved
        assertEq(tokenV2.balanceOf(user), mintAmount);

        // Verify roles were migrated correctly
        bytes32 minterRole = tokenV2.MINTER_ROLE();
        bytes32 upgraderRole = tokenV2.UPGRADER_ROLE();
        bytes32 defaultAdminRole = tokenV2.DEFAULT_ADMIN_ROLE();

        assertTrue(tokenV2.hasRole(defaultAdminRole, owner));
        assertTrue(tokenV2.hasRole(minterRole, owner));
        assertTrue(tokenV2.hasRole(upgraderRole, owner));

        // Verify minting works with role-based access
        uint256 additionalMint = 500 ether;
        tokenV2.mint(user, additionalMint);
        assertEq(tokenV2.balanceOf(user), mintAmount + additionalMint);
    }

    /**
     * @dev Test that non-minters cannot mint in V2
     */
    function test_PreventNonMinterMintingV2() public {
        // Deploy and upgrade
        bytes memory initData = abi.encodeCall(TokenV1.initialize, (owner));
        proxy = Upgrades.deployUUPSProxy("contracts/TokenV1.sol:TokenV1", initData);
        tokenV1 = TokenV1(proxy);

        bytes memory migrateData = abi.encodeCall(TokenV2.migrateFromV1, (owner));
        Upgrades.upgradeProxy(proxy, "contracts/TokenV2.sol:TokenV2", migrateData, owner);
        tokenV2 = TokenV2(proxy);

        // Non-minter should not be able to mint
        vm.prank(nonMinter);
        vm.expectRevert();
        tokenV2.mint(nonMinter, 100 ether);
    }
}

