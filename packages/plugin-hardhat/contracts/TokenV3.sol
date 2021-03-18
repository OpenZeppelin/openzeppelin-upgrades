// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./Token.sol";

contract TokenV3 is Token {
 function transferPercent(address to, uint256 pct) external {
    uint256 amount = SafePercent.getPercent(balances[msg.sender], pct);
    transfer(to, amount);
  }
}

import "./utils/Proxiable.sol";
contract TokenV3Proxiable is TokenV3, Proxiable {}
