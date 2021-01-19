pragma solidity ^0.5.1;

import "./ExternalLibraries.sol";

contract Token {

  using SafeMath for uint256;

  string public symbol;
  uint256 public totalSupply;
  
  address public owner;

  mapping(address => uint256) balances;

  function initialize(string memory tokenSymbol, uint256 amount) public { 
    symbol = tokenSymbol;
    totalSupply = amount;
    balances[msg.sender] = amount;
    owner = msg.sender;
  }

  function transfer(address to, uint256 amount) public {
    require(balances[msg.sender] >= amount, "Not enough tokens");
    balances[msg.sender] = balances[msg.sender].sub(amount);
    balances[to] = balances[to].add(amount);
  }
   
  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function getLibraryVersion() external pure returns(string memory) {
      return SafeMath.version();
  }

}
