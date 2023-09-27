pragma solidity >= 0.4.22 <0.8.0;

// This contract is for testing only, it is not safe for use in production.

contract Proxiable50 {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    function upgradeToAndCall(address newImplementation, bytes calldata data) external {
        _setImplementation(newImplementation);
        if (data.length > 0) {
            /**
             * Using address(this).call is dangerous as the call can impersonate the proxy being upgraded.
             * a better option is to use a delegate call with an oz-upgrades-unsafe-allow, but this is not
             * supported by the early version of solidity used here.
             *
             * /// @custom:oz-upgrades-unsafe-allow delegatecall
             * (bool success, ) = newImplementation.delegatecall(data);
             *
             * Note that using delegate call can make your implementation contract vulnerable if this function
             * is not protected with the `onlyProxy` modifier. Again, This contract is for testing only, it is
             * not safe for use in production. Instead, use the `UUPSUpgradeable` contract available in
             * @openzeppelin/contracts-upgradeable
             */
            (bool success, ) = address(this).call(data);
            require(success, "upgrade call reverted");
        } else {
            _checkNonPayable();
        }
    }

    function _checkNonPayable() private {
        if (msg.value > 0) {
            revert('non-payable upgrade call');
        }
    }

    function _setImplementation(address newImplementation) private {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, newImplementation)
        }
    }
}
