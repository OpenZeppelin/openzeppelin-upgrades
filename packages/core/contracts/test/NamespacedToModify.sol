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

    /// @custom:storage-location erc7201:example.with.following.comment
    // some comment
    struct StorageWithComment {
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
  /// @param myInt an integer
  constructor(uint myInt) {}

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
    modifier myModifier() {
        _;
    }
    function foo(S calldata s) internal pure myModifier returns (S calldata) {
        return s;
    }
}

library LibWithRequiredReturn {
    struct S { uint x; }
    modifier myModifier() {
        _;
    }
    function foo(S calldata s) myModifier internal pure returns (S calldata) {
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

/**
 * @param a first
 * @param b second
 */
function hasReturnsDocumentedAsParams() pure returns (uint a, uint b) {
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

    /**
     * @param a first
     * @param b second
     */
    function hasReturnsDocumentedAsParamsInContract() public pure returns (uint a, uint b) {
    }
}

interface IHasExternalViewFunction {
    function foo() external view returns (uint256);
}

contract HasExternalViewFunction is IHasExternalViewFunction {
    // This generates a getter function that conforms to the interface
    uint256 public foo;

    // References a selector in an interface
    bytes4 constant USING_INTERFACE_FUNCTION_SELECTOR = IHasExternalViewFunction.foo.selector;

    // References a getter generated for a public variable
    bytes4 immutable IMMUTABLE_USING_GETTER = this.foo.selector;
}

contract DeploysContractToImmutable {
    HasFunction public immutable example = new HasFunction(1);
}

contract HasSpecialFunctions {
    /// @param data call data
    /// @return dataReturn returned data
    fallback(bytes calldata data) external returns (bytes memory dataReturn) {
        return data;
    }

    receive() external payable {
    }

    // Regular function but payable
    function hasPayable() public payable {
    }

    bytes4 constant PAYABLE_SELECTOR = this.hasPayable.selector;
}

/// This is not considered a namespace according to ERC-7201 because the namespaced struct is outside of a contract.
library LibraryWithNamespace {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }
}

interface InterfaceWithNamespace {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }
}

interface IHasConstantGetter {
  function a() external view returns (bytes32);
}

contract HasConstantGetter is IHasConstantGetter {
  bytes32 public override constant a = bytes32("foo");
}

abstract contract AbstractHasConstantGetter {
  function a() virtual external pure returns (bytes32) {
    // Virtual with default implementation
    return bytes32("foo");
  }
}

contract HasConstantGetterOverride is AbstractHasConstantGetter {
  bytes32 public override constant a = bytes32("foo");
}

contract HasFunctionOverride is AbstractHasConstantGetter {
  function a() override virtual external pure returns (bytes32) {
    return bytes32("foo2");
  }
}