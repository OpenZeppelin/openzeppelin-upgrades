// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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

