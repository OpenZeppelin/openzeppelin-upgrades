pragma solidity >= 0.6.0 <0.8.0;

// These contracts are for testing only, they are not safe for use in production.

interface ITransparentUpgradeableProxy {
    function upgradeTo(address) external;
    function upgradeToAndCall(address, bytes memory) external payable;
}

contract UnsafeAdminFallbackString {
    // NOT SAFE FOR PRODUCTION USE. ANYONE CAN UPGRADE THE PROXY THROUGH THE BELOW.

    function upgrade(ITransparentUpgradeableProxy proxy, address implementation) public virtual {
        proxy.upgradeTo(implementation);
    }

    function upgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory data
    ) public payable virtual {
        proxy.upgradeToAndCall{value: msg.value}(implementation, data);
    }

    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encode("foo");
    }
}

contract GreeterTransparent40FallbackString {
    string greeting;

    function initialize(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }
}

contract GreeterTransparent40FallbackStringV2 is GreeterTransparent40FallbackString {
    function resetGreeting() public {
        greeting = "Hello World";
    }
}