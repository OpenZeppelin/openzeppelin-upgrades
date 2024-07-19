// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Example {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    /// @custom:storage-location erc7201:example.secondary
    struct SecondaryStorage {
        uint256 a;
        uint256 b;
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

    /**
     * @dev a custom error inside a contract
     */
    error CustomErrorInsideContract(address a);

    uint256 public spaceSemicolon ;
    uint256 public twoSpacesSemicolon  ;
    uint256 public tabSemicolon	;
    uint256 public lineBreakSemicolon
    ;
    error SpaceSemicolon(uint256 a) ;
}

contract HasFunction {
  constructor(uint) {}
  function foo() pure public returns (uint) {}
}

contract UsingFunction is HasFunction(1) {
  uint x = foo();
}

function FreeFunctionUsingSelector() pure returns (bytes4) {
    return HasFunction.foo.selector;
}

bytes4 constant CONSTANT_USING_SELECTOR = HasFunction.foo.selector;

library Lib {
  function usingSelector() pure public returns (bytes4) {
    return HasFunction.foo.selector;
  }

  function plusOne(uint x) pure public returns (uint) {
    return x + 1;
  }
}

contract Consumer {
  bytes4 public variableFromConstant = CONSTANT_USING_SELECTOR;

  function usingFreeFunction() pure public returns (bytes4) {
    return FreeFunctionUsingSelector();
  }

  function usingConstant() pure public returns (bytes4) {
    return CONSTANT_USING_SELECTOR;
  }

  function usingLibraryFunction() pure public returns (bytes4) {
    return Lib.usingSelector();
  }
}

contract HasConstantWithSelector {
  bytes4 constant CONTRACT_CONSTANT_USING_SELECTOR = HasFunction.foo.selector;
}

function plusTwo(uint x) pure returns (uint) {
  return x + 2;
}

/**
 * @notice originally orphaned natspec
 */

/**
 * @dev plusThree
 * @param x x
 */
function plusThree(uint x) pure returns (uint) {
  return x + 3;
}

/// @notice originally orphaned natspec 2

/**
 * @dev plusThree overloaded
 * @param x x
 * @param y y
 */
function plusThree(uint x, uint y) pure returns (uint) {
  return x + y + 3;
}

function originallyNoDocumentation() pure {}

/**
 * @param foo foo
 */
using {plusTwo} for uint;

contract UsingForDirectives {
  using {Lib.plusOne} for uint;

  function usingFor(uint x) pure public returns (uint) {
    return x.plusOne() + x.plusTwo();
  }
}

/**
 * @title a
 * @author a
 * @inheritdoc Example
 * @dev a
 * @custom:a a
 * @notice a
 * @param a a
 * @return a a
 */
enum FreeEnum { MyEnum }

/**
 * @dev a custom error outside a contract
 * @param example example parameter
 */
error CustomErrorOutsideContract(Example example);

int8 constant MAX_SIZE_C = 2;

contract StructArrayUsesConstant {
  uint16 private constant MAX_SIZE = 10;

  struct NotNamespaced {
    uint16 a;
    uint256[MAX_SIZE] b;
    uint256[MAX_SIZE_C] c;
  }

  /// @custom:storage-location erc7201:uses.constant
  struct MainStorage {
    uint256 x;
    uint256[MAX_SIZE] y;
    uint256[MAX_SIZE_C] c;
  }
}

address constant MY_ADDRESS = address(0);
uint constant CONVERTED_ADDRESS = uint160(MY_ADDRESS);

interface IDummy {
}

contract UsesAddress {
  IDummy public constant MY_CONTRACT = IDummy(MY_ADDRESS);
}

contract HasFunctionWithRequiredReturn {
    struct S { uint x; }
    function foo(S calldata s) internal pure returns (S calldata) {
        return s;
    }
}

/**
 * @return uint 1
 * @return uint 2
 */
function hasMultipleReturns() pure returns (uint, uint) {
    return (1, 2);
}

/**
 * @return a first
 * @return b second
 */
function hasMultipleNamedReturns() pure returns (uint a, uint b) {
}

contract HasNatSpecWithMultipleReturns {
    /**
     * @return uint 1
     * @return uint 2
     */
    function hasMultipleReturnsInContract() public pure returns (uint, uint) {
    }

    /**
     * @return a first
     * @return b second
     */
    function hasMultipleNamedReturnsInContract() public pure returns (uint a, uint b) {
    }
}
