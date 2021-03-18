// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./Token.sol";

contract TokenV2 is Token {
 function transferAll(address to) external {
    uint256 amount = balances[msg.sender];
    transfer(to, amount);
  }
}

import "./utils/Proxiable.sol";
contract TokenV2Proxiable is TokenV2, Proxiable {}
