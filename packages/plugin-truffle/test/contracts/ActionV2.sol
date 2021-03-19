pragma solidity ^0.5.1;

contract ActionV2 {
    enum ActionType { UP, DOWN, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function initialize() public view {
    }

    function log() public {
        emit ActionEvent(action);
    }

}

contract ActionV2Bad {
    enum ActionType { UP, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function log() public {
        emit ActionEvent(action);
    }
}

import "./utils/Proxiable.sol";
contract ActionV2Proxiable is ActionV2, Proxiable {}
contract ActionV2BadProxiable is ActionV2Bad, Proxiable {}
