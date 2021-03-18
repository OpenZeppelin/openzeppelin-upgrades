pragma solidity ^0.5.1;

import "./Token.sol";

contract TokenV2 is Token {
 function transferAll(address to) external {
    uint256 amount = balances[msg.sender];
    transfer(to, amount);
  }
}

import "./utils/Proxiable.sol";
contract TokenV2Proxiable is TokenV2, Proxiable {}
