pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    function initialize() public view {
        console.log("Deploying Action");
    }

    function log(ActionType action) public {
        emit ActionEvent(action);
    }

}
