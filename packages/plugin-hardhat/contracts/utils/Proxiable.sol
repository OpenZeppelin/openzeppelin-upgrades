pragma solidity >= 0.4.22 <0.8.0;

contract Proxiable {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function upgradeTo(address newImplementation) external {
        _setImplementation(newImplementation);
    }

    // function upgradeToAndCall(address newImplementation, bytes calldata data) external payable {
    //     _setImplementation(newImplementation);
    //     (bool success, ) = newImplementation.delegatecall(data);
    //     require(success, "upgradeToAndCall: call failled");
    // }

    function _setImplementation(address newImplementation) private {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, newImplementation)
        }
    }
}
