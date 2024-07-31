// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract RenameV1 {
    uint x;
}

contract RenameV2 {
    /// @custom:oz-renamed-from x
    uint y;
}

contract RetypeV1 {
    bool x;
}

contract RetypeV2 {
    /// @dev a retyped variable
    /// @custom:oz-retyped-from bool
    uint8 x;
}

contract WronglyReportedRetypeV3 {
    /// @custom:oz-retyped-from address
    uint8 x;
}

contract MissmatchingTypeRetypeV4 {
    /// @custom:oz-retyped-from bool
    bytes32 x;
}

contract ConfusingRetypeV1 {
    address y;
    bool x;
}

contract ConfusingRetypeV2 {
    address y;
    /// @custom:oz-retyped-from address
    uint8 x;
}

contract NonHardcodedRetypeV1 {
    address a;
}

contract NonHardcodedRetypeV2 {
    /// @custom:oz-retyped-from address
    bytes20 a;
}

contract LayoutChangeV1 {
    bool a;
    bool b;
}

contract LayoutChangeV2 {
    /// @custom:oz-retyped-from bool
    uint16 a;

    /// @custom:oz-retyped-from bool
    uint8 b;
}

contract RenameStructV1 {
    struct History {
        Checkpoint[] _checkpoints;
    }

    struct Checkpoint {
        uint32 _blockNumber;
        uint224 _value;
    }

    History history;
}

contract RenameStructV2a {
    struct Trace224 {
        Checkpoint224[] _checkpoints;
    }

    struct Checkpoint224 {
        uint32 _blockNumber;
        uint224 _value;
    }

    Trace224 history;
}

contract RenameStructV2b {
    struct Trace224 {
        Checkpoint224[] _checkpoints;
    }

    struct Checkpoint224 {
        uint32 _key;
        uint224 _value;
    }

    /// @custom:oz-retyped-from RenameStructV1.History
    Trace224 history;
}

contract InnerRetypeV1 {
    struct ProposalCore {
        BlockNumber key;
        bool flag;
    }

    struct BlockNumber {
        uint32 blockNumber;
    }

    ProposalCore core;
}

contract InnerRetypeV2Good {
    struct ProposalCore {
        uint256 blockNumber;
        bool flag;
    }

    /// @custom:oz-retyped-from InnerRetypeV1.ProposalCore
    ProposalCore core;
}

contract InnerRetypeV2Bad {
    struct ProposalCore {
        uint16 a;
        uint224 b;
        uint16 c;
        bool flag;
    }

    /// @custom:oz-retyped-from InnerRetypeV1.ProposalCore
    ProposalCore core;
}
