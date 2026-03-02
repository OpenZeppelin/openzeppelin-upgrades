// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Upgrades } from "@openzeppelin/foundry-upgrades/src/Upgrades.sol";
import { Options } from "@openzeppelin/foundry-upgrades/src/Options.sol";

import { Box } from "../../contracts/Box.sol";
import { BoxV2 } from "../../contracts/BoxV2.sol";

contract UpgradesTest is Test {
    function testDeployAndUpgradeTransparentProxy() public {
        address proxy = Upgrades.deployTransparentProxy(
            "contracts/Box.sol:Box",
            msg.sender,
            abi.encodeCall(Box.initialize, (42))
        );
        Box box = Box(proxy);
        assertEq(box.retrieve(), 42);

        Upgrades.upgradeProxy(proxy, "contracts/BoxV2.sol:BoxV2", "", msg.sender);
        BoxV2 boxV2 = BoxV2(proxy);

        boxV2.increment();
        assertEq(boxV2.retrieve(), 43);
    }

    function testValidateUpgrade() public {
        Options memory opts;
        Upgrades.validateUpgrade("contracts/BoxV2.sol:BoxV2", opts);
    }
}
