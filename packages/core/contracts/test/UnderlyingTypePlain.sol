// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades between a user-defined value type and its underlying type
type Amount is uint128;

contract UnderlyingTypePlain {
    uint128 a;
}

contract UnderlyingTypeUserDefined {
    Amount a;
}

contract UnderlyingTypeFromPlainAnnotated {
    /// @custom:oz-retyped-from uint128
    Amount a;
}

contract UnderlyingTypeToPlainAnnotated {
    /// @custom:oz-retyped-from Amount
    uint128 a;
}
