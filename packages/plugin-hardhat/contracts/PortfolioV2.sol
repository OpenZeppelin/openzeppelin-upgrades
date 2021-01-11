pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract PortfolioV2 {
    struct Asset {
        bool enabled;
        uint amount;
    }

    mapping (string => Asset) assets;

    function initialize() public view {
        console.log("Deploying PortfolioV2");
    }

    function enable(string memory name) public returns (bool) {
        if (assets[name].enabled) {
            return false;
        } else {
            assets[name] = Asset(true, 10);
            return true;
        }
    }

}

contract PortfolioV2Bad {
    struct Asset {
        uint amount;
    }

    mapping (string => Asset) assets;

    function initialize() public view {
        console.log("Deploying PortfolioV2");
    }

    function enable(string memory name) public returns (bool) {
        assets[name] = Asset(10);
        return true;
    }

}
