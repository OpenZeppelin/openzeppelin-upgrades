pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

contract Portfolio {
    struct Asset {
        bool enabled;
        uint amount;
    }

    mapping (string => Asset) assets;

    function initialize() public view {
        console.log("Deploying Portfolio");
    }

    function enable(string memory name) public returns (bool) {
        if (assets[name].enabled) {
            return false;
        } else {
            assets[name] = Asset(true, 0);
            return true;
        }
    }

}
