pragma solidity ^0.5.1;

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function log() public {
        emit ActionEvent(action);
    }

}

import "./utils/Proxiable.sol";
contract ActionProxiable is Action, Proxiable {}
