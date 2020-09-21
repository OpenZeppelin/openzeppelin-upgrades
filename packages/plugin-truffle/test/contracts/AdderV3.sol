pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

library SafeAddExternal {
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }
}

contract AdderV3 {
    using SafeAddExternal for uint;

    uint public n;

    function initialize(uint _n) public {
        n = _n;
    }

    function add(uint x) public returns (uint) {
        n = n.add(x);
        return n;
    }

}
