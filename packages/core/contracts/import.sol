// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

contract AdminUpgradeabilityProxy is TransparentUpgradeableProxy {
    constructor(address _logic, address admin_, bytes memory _data) payable TransparentUpgradeableProxy(_logic, admin_, _data) {}
}
