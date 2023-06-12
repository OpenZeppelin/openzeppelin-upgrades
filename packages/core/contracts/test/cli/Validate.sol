// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @custom:oz-upgrades
 */
contract Safe {
  function safe() view public {
  }
}

contract NonUpgradeable {
  function sd() public {
    selfdestruct(payable(msg.sender));
  }
}

abstract contract Initializable {
  function initialize() virtual public;
}

contract HasInitializer is Initializable {
  function initialize() override public {
  }
}

contract HasUpgradeTo {
  function upgradeTo(address) public {
  }
}

contract HasUpgradeToConstructorUnsafe {
  constructor() { msg.sender; }

  function upgradeTo(address) public {
  }
}

/**
 * @custom:oz-upgrades
 */
contract MultipleUnsafe {
  function sd() public {
    selfdestruct(payable(msg.sender));
  }

  /// @custom:oz-upgrades-unsafe-allow selfdestruct
  function sd2() public {
    selfdestruct(payable(msg.sender));
  }

  function dc() public {
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }

  function dc2() public {
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}

/**
 * @custom:oz-upgrades
 */
contract InheritsMultipleUnsafe is MultipleUnsafe {
}

/**
 * @custom:oz-upgrades-from HasUpgradeTo
 */
contract UpgradesFromUUPS {
  // unsafe: v1 is uups, v2 missing upgradeTo
}

/**
 * @custom:oz-upgrades-from HasInitializer
 */
contract UpgradesFromTransparent {
  // safe: v1 is transparent, v2 is transparent
}

contract StorageV1 {
  uint256 public x;
  uint256[49] private __gap;
}

/**
 * @custom:oz-upgrades-from StorageV1
 */
contract UnsafeAndStorageLayoutErrors {
  uint256 public x;
  uint256 public y;
  uint256[49] private __gap;

  function sd() public {
    selfdestruct(payable(msg.sender));
  }
}

/**
 * @custom:oz-upgrades-from MultipleUnsafe
 */
contract BecomesSafe {
  bool public x;
}

/**
 * @custom:oz-upgrades-from BecomesSafe
 */
contract BecomesBadLayout {
}

/**
 * @custom:oz-upgrades-from NonUpgradeable
 */
contract StillUnsafe {
  function sd() public {
    selfdestruct(payable(msg.sender));
  }
}

abstract contract AbstractUpgradeable is Initializable {
}

contract InheritsAbstractUpgradeable is AbstractUpgradeable {
    function initialize() public virtual override {}
}

/**
 * @custom:oz-upgrades
 * @custom:oz-upgrades-from StorageV1
 */
contract BothAnnotationsUnsafe {
  uint256 public x;
  uint256 public y;
  uint256[49] private __gap;

  function sd() public {
    selfdestruct(payable(msg.sender));
  }
}