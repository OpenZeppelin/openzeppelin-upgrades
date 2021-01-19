
pragma solidity ^0.5.1;

library SafeMath {
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    function sub(uint256 a, uint256 b) external pure returns (uint256) {
      require(b <= a, "SafeMath: subtraction overflow");
      uint256 c = a - b;

      return c;
    } 

    function version() external pure returns (string memory) {
      return "V1";
    }
}

library SafeMathV2 {
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    function sub(uint256 a, uint256 b) external pure returns (uint256) {
     require(b <= a, "SafeMath: subtraction overflow");
      uint256 c = a - b;

      return c;
    } 

    function version() external pure returns (string memory) {
      return "V2";
    }
}

library SafePercent {
    function getPercent(uint256 a, uint256 pct) external pure returns (uint256) {
        uint256 c = div(mul(a,pct),100);
        
        return c;
    }

   function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        require(c / a == b, "SafePercent: multiplication overflow");

        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafePercent: division by zero");
        uint256 c = a / b;
       
        return c;
    }
}

