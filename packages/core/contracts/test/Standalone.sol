// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

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

contract StandaloneRenameV1 {
    uint x;
}

contract StandaloneRenameV2 {
    /// @custom:oz-renamed-from x
    uint y;
}

contract StandaloneRenameV3 is StandaloneRenameV2 {
    uint z;
}