// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

// These contracts are for testing only. They are not safe for use in production, and do not represent best practices.

// ==== Parent contracts ====

contract Parent_NoInitializer {
  uint8 x;
  function parentFn() internal {
    x = 1;
  }
}

contract Parent_InitializerModifier is Initializable {
  uint8 x;
  function parentInit() initializer internal {
    x = 1;
  }
}

contract Parent_ReinitializerModifier is Initializable {
  uint8 x;
  function parentReinit() reinitializer(2) internal {
    x = 1;
  }
}

contract Parent__OnlyInitializingModifier is Initializable {
  uint8 x;
  function __Parent_init() onlyInitializing() internal {
    x = 1;
  }
}

contract Parent_InitializeName {
  uint8 x;
  function initialize() internal virtual {
    x = 1;
  }
}

contract Parent_InitializerName {
  uint8 x;
  function initializer() internal {
    x = 1;
  }
}

contract Parent_ReinitializeName {
  uint8 x;
  function reinitialize(uint64 version) internal {
    x = 1;
  }
}

contract Parent_ReinitializerName {
  uint8 x;
  function reinitializer(uint64 version) internal {
    x = 1;
  }
}

// ==== Child contracts ====

contract Child_Of_NoInitializer_Ok is Parent_NoInitializer {
  uint y;
  function childFn() public {
    y = 2;
  }
}

contract Child_Of_InitializerModifier_Ok is Parent_InitializerModifier {
  uint y;
  function initialize() public {
    parentInit();
    y = 2;
  }
}

contract Child_Of_InitializerModifier_UsesSuper_Ok is Parent_InitializerModifier {
  uint y;
  function initialize() public {
    super.parentInit();
    y = 2;
  }
}

contract Child_Of_InitializerModifier_Bad is Parent_InitializerModifier {
  uint y;
  function initialize() public {
    y = 2;
  }
}

contract Child_Of_ReinitializerModifier_Ok is Parent_ReinitializerModifier {
  uint y;
  function initialize() public {
    parentReinit();
    y = 2;
  }
}

contract Child_Of_ReinitializerModifier_Bad is Parent_ReinitializerModifier {
  uint y;
  function initialize() public {
    y = 2;
  }
}

contract Child_Of_OnlyInitializingModifier_Ok is Parent__OnlyInitializingModifier {
  uint y;
  function initialize() public {
    __Parent_init();
    y = 2;
  }
}

contract Child_Of_OnlyInitializingModifier_Bad is Parent__OnlyInitializingModifier {
  uint y;
  function initialize() public {
    y = 2;
  }
}

// This is considered to have a missing initializer because the `regularFn` function is not inferred as an intializer
contract MissingInitializer_Bad is Parent_InitializerModifier {
  uint y;
  function regularFn() public {
    parentInit();
    y = 2;
  }
}

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MissingInitializer_UnsafeAllow_Contract is Parent_InitializerModifier {
  uint y;
  function regularFn() public {
    parentInit();
    y = 2;
  }
}

contract A is Initializable {
  uint a;
  function __A_init() onlyInitializing internal {
    a = 2;
  }
}

contract B is Initializable {
  uint b;
  function __B_init() onlyInitializing internal {
    b = 2;
  }
}

contract C is Initializable {
  uint c;
  function __C_init() onlyInitializing internal {
    c = 2;
  }
}

contract InitializationOrder_Ok is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    __C_init();
  }
}

contract InitializationOrder_Ok_2 is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn(); // this is not an initializer so we don't check its linearization order
    __C_init();
  }
}

contract InitializationOrder_WrongOrder_Bad is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __C_init();
    parentFn();
    __B_init();
  }
}

/// @custom:oz-upgrades-unsafe-allow incorrect-initializer-order
contract InitializationOrder_WrongOrder_UnsafeAllow_Contract is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __C_init();
    parentFn();
    __B_init();
  }
}

contract InitializationOrder_WrongOrder_UnsafeAllow_Function is A, B, C, Parent_NoInitializer {
  /// @custom:oz-upgrades-unsafe-allow incorrect-initializer-order
  function initialize() public {
    __A_init();
    __C_init();
    parentFn();
    __B_init();
  }
}

contract InitializationOrder_MissingCall_Bad is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
  }
}

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract InitializationOrder_MissingCall_UnsafeAllow_Contract is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
  }
}

contract InitializationOrder_MissingCall_UnsafeAllow_Function is A, B, C, Parent_NoInitializer {
  /// @custom:oz-upgrades-unsafe-allow missing-initializer-call
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
  }
}

contract InitializationOrder_Duplicate_Bad is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
    __B_init();
    __C_init();
  }
}

/// @custom:oz-upgrades-unsafe-allow duplicate-initializer-call
contract InitializationOrder_Duplicate_UnsafeAllow_Contract is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
    __B_init();
    __C_init();
  }
}

contract InitializationOrder_Duplicate_UnsafeAllow_Function is A, B, C, Parent_NoInitializer {
  /// @custom:oz-upgrades-unsafe-allow duplicate-initializer-call
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
    __B_init();
    __C_init();
  }
}

contract InitializationOrder_Duplicate_UnsafeAllow_Call is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __B_init();
    parentFn();
    /// @custom:oz-upgrades-unsafe-allow duplicate-initializer-call
    __B_init();
    __C_init();
  }
}

/// @custom:oz-upgrades-unsafe-allow duplicate-initializer-call
contract InitializationOrder_UnsafeAllowDuplicate_But_WrongOrder is A, B, C, Parent_NoInitializer {
  function initialize() public {
    __A_init();
    __C_init();
    __B_init();
    __B_init();
  }
}

// ==== Initializer visibility ====

contract Parent_PrivateInitializer {
  uint x;
  function initialize() private { // not considered an initializer because it's private
    x = 1;
  }
}

contract Parent_PublicInitializer {
  uint x;
  function initialize() public { // does not strictly need to be called by child
    x = 1;
  }
}

contract Child_Of_ParentPrivateInitializer_Ok is Parent_PrivateInitializer { // no initializer required since parent initializer is private
}

contract Child_Of_ParentPublicInitializer_Ok is Parent_PublicInitializer { // no initializer required since parent initializer is public
}

contract Child_Has_PrivateInitializer_Bad is Parent__OnlyInitializingModifier { // parent has internal initializer, but child has private
  function initialize() private {
    __Parent_init();
  }
}

// ==== Transitive initialization ====

abstract contract TransitiveGrandparent1 is Initializable {
  uint x;
  function __TransitiveGrandparent1_init() onlyInitializing internal {
    x = 1;
  }
}

abstract contract TransitiveGrandparent2 is Initializable {
  uint y;
  function __TransitiveGrandparent2_init() onlyInitializing internal {
    y = 1;
  }
}

contract TransitiveParent_Ok is TransitiveGrandparent1, TransitiveGrandparent2 {
  function initializeParent() initializer public {
    __TransitiveGrandparent1_init();
    __TransitiveGrandparent2_init();
  }
}

contract TransitiveParent_Bad is TransitiveGrandparent1, TransitiveGrandparent2 {
  function initializeParent() initializer public {
    __TransitiveGrandparent1_init();
    // Does not call __TransitiveGrandparent2_init, and this contract is not abstract, so it is required
  }
}

contract TransitiveChild_Bad_Parent is TransitiveParent_Bad { // this contract is ok but the parent is not
  function initialize() initializer public {
    initializeParent();
  }
}

contract TransitiveChild_Bad_Order is TransitiveParent_Bad { // grandparent should be initialized first
  function initialize() initializer public {
    initializeParent();
    __TransitiveGrandparent2_init();
  }
}

contract TransitiveChild_Bad_Order2 is TransitiveParent_Bad { // this contract is ok but the parent is not
  function initialize() initializer public {
    __TransitiveGrandparent2_init();
    initializeParent();
  }
}

contract TransitiveDuplicate_Bad is TransitiveGrandparent1, TransitiveParent_Ok {
  function initialize() initializer public {
    __TransitiveGrandparent1_init();
    initializeParent();
  }
}

contract Ownable_Ok is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner);
    }
}

contract Ownable2Step_Ok is Initializable, ERC20Upgradeable, Ownable2StepUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner); // Transitive dependency that needs to be initialized
        __Ownable2Step_init();
    }
}

contract Ownable2Step_Bad is Initializable, ERC20Upgradeable, Ownable2StepUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __ERC20_init("MyToken", "MTK");
        // Missing Ownable, which is a transitive dependency that needs to be initialized
        __Ownable2Step_init();
    }
}