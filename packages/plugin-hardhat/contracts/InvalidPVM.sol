pragma solidity ^0.5.1;

import './utils/Proxiable.sol';
contract InvalidPVMProxiable is Proxiable {
    string greeting;

    // This constructor should cause validations to fail, since there is no annotation set to allow it
    constructor() public {
        greeting = 'Constructor called';
    }
}
