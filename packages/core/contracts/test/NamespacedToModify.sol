// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Example {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    /// @notice some natspec
    function foo() public {}

    /// @param a docs
    function foo1(uint a) public {}

    /// @param a docs
    function foo2(uint a) internal {}
    struct MyStruct { uint b; }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;

    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := MAIN_STORAGE_LOCATION
        }
    }

    function _getXTimesY() internal view returns (uint256) {
        MainStorage storage $ = _getMainStorage();
        return $.x * $.y;
    }

    /// @notice standlone natspec

    /// @notice natspec for var
    uint256 normalVar;

    // standalone doc

    /**
     * standlone doc block
     */

    /**
     * doc block without natspec
     */
    function foo3() public {}

    /**
     * doc block with natspec
     *
     * @notice some natspec
     */
    function foo4() public {}
}

contract A {
  constructor(uint) {}
  function foo() pure public returns (uint) {}
}

contract B is A(1) {
  uint x = foo();
}

function bar() pure returns (bytes4) {
    return A.foo.selector; // <- A.foo deleted
}

bytes4 constant barConst = A.foo.selector; // <- A.foo deleted

library Lib {
  function barFromLib() pure public returns (bytes4) {
    return A.foo.selector; // <- A.foo deleted
  }
}

contract C {
  function usingBar() pure public returns (bytes4) {
    return bar(); // Uses free function
  }

  function usingBarConst() pure public returns (bytes4) {
    return barConst; // Uses constant
  }

  function usingBarFromLib() pure public returns (bytes4) {
    return Lib.barFromLib(); // Uses library function
  }
}
