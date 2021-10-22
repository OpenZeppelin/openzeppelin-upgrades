// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract StandaloneV1 {
    uint a;
    string b;

    function extremelyUnsafe(address target, bytes memory data) public {
        (bool ok, ) = target.delegatecall(data);
        require(ok);
    }
}

contract StandaloneV2Good {
    uint a;
    string b;
    uint c;
}

contract StandaloneV2Bad {
    uint x;
    uint a;
    string b;
}
