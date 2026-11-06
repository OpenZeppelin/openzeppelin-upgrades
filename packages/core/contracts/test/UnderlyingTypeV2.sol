// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades from UnderlyingTypeV1.sol, where `Amount` is `uint128`
type Amount is int128;
type SmallAmount is int64;

contract UnderlyingTypeUnannotated {
    Amount a;
    mapping(address => Amount) m;
    Amount[] list;
}

contract UnderlyingTypeAnnotated {
    /// @custom:oz-retyped-from uint128
    Amount a;
    /// @custom:oz-retyped-from mapping(address => uint128)
    mapping(address => Amount) m;
    /// @custom:oz-retyped-from uint128[]
    Amount[] list;
}

// The annotations name the types of the variables, which are the same in both versions
contract UnderlyingTypeOwnTypeAnnotated {
    /// @custom:oz-retyped-from Amount
    Amount a;
    /// @custom:oz-retyped-from mapping(address => Amount)
    mapping(address => Amount) m;
    /// @custom:oz-retyped-from Amount[]
    Amount[] list;
}

// `a` changes to a smaller type, which the annotation does not allow
contract UnderlyingTypeResized {
    /// @custom:oz-retyped-from uint128
    SmallAmount a;
    /// @custom:oz-retyped-from mapping(address => uint128)
    mapping(address => Amount) m;
    /// @custom:oz-retyped-from uint128[]
    Amount[] list;
}
