// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades from UnderlyingTypeV1.sol, where `Amount` is `uint128`
type Amount is int128;
type RenamedAmount is int128;
type SmallAmount is int64;

contract UnderlyingTypeUnannotated {
    Amount a;
    mapping(address => Amount) m;
}

contract UnderlyingTypeAnnotated {
    /// @custom:oz-retyped-from uint128
    Amount a;

    // The value type is renamed, so that the annotation does not name the mapping's own type
    /// @custom:oz-retyped-from mapping(address => Amount)
    mapping(address => RenamedAmount) m;
}

contract UnderlyingTypeOwnTypeAnnotated {
    /// @custom:oz-retyped-from Amount
    Amount a;

    /// @custom:oz-retyped-from mapping(address => Amount)
    mapping(address => Amount) m;
}

contract UnderlyingTypeResized {
    /// @custom:oz-retyped-from uint128
    SmallAmount a;

    /// @custom:oz-retyped-from mapping(address => Amount)
    mapping(address => RenamedAmount) m;
}
