// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract NonUpgradeable {
    function sd() public {
        selfdestruct(payable(msg.sender));
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
        (bool s, ) = msg.sender.delegatecall('');
        s;
    }

    function dc2() public {
        (bool s, ) = msg.sender.delegatecall('');
        s;
    }
}

/**
 * @custom:oz-upgrades
 */
contract InheritsMultipleUnsafe is MultipleUnsafe {}

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
 * @custom:oz-upgrades-from NonUpgradeable
 */
contract StillUnsafe {
    function sd() public {
        selfdestruct(payable(msg.sender));
    }
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
