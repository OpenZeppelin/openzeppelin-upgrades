// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

library StorageSlot {
    struct AddressSlot { address value; }
    struct BooleanSlot { bool value; }
    struct Bytes32Slot { bytes32 value; }
    struct Uint256Slot { uint256 value; }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) { assembly { r.slot := slot } }
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) { assembly { r.slot := slot } }
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) { assembly { r.slot := slot } }
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) { assembly { r.slot := slot } }
}

abstract contract ERC1967Storage {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) internal {
        require(isContract(newImplementation), "ERC1967: new implementation is not a contract");
        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}

abstract contract ERC1967Upgrade is ERC1967Storage {
    bytes32 internal constant _UPGRADE_PENDING_SLOT = 0x39c07022fef61edd40345eccc814df883dce06b1b65a92ff48ae275074d292ee;

    event Upgraded(address indexed implementation);

    function _upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _upgradeToAndCall(newImplementation, data, false);
    }

    function _upgradeToAndCall(address newImplementation, bytes memory data, bool forceCall) internal {
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
        if (data.length > 0 || forceCall) {
            functionDelegateCall(newImplementation, data);
        }
    }

    function _upgradeToAndCallSecure(address newImplementation, bytes memory data) internal {
        _upgradeToAndCallSecure(newImplementation, data, false);
    }

    function _upgradeToAndCallSecure(address newImplementation, bytes memory data, bool forceCall) internal {
        address oldImplementation = _getImplementation();
        // check if nested in an upgrade check
        StorageSlot.BooleanSlot storage upgradePending = StorageSlot.getBooleanSlot(_UPGRADE_PENDING_SLOT);
        // do inital upgrade
        _setImplementation(newImplementation);
        // do setup call
        if (data.length > 0 || forceCall) {
            functionDelegateCall(newImplementation, data);
        }
        if (!upgradePending.value) {
            // trigger upgrade check with flag set to true
            upgradePending.value = true;
            functionDelegateCall(
                newImplementation,
                abi.encodeWithSignature(
                    "upgradeTo(address)",
                    oldImplementation
                )
            );
            upgradePending.value = false;
            // check upgrade was effective
            require(oldImplementation == _getImplementation(), "ERC1967Upgrade: upgrade breaks further upgrades");
            // reset upgrade
            _setImplementation(newImplementation);
            // emit event
            emit Upgraded(newImplementation);
        }
    }

    function functionDelegateCall(address target, bytes memory data) private returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) private returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");
        // solhint-disable-next-line avoid-low-level-calls
        /// @custom:oz-upgrades-unsafe-allow delegatecall
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    function _verifyCallResult(bool success, bytes memory returndata, string memory errorMessage) private pure returns(bytes memory) {
        if (success) {
            return returndata;
        } else {
            if (returndata.length > 0) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

abstract contract Proxiable is ERC1967Upgrade {
    function upgradeTo(address newImplementation) external virtual {
        _beforeUpgrade(newImplementation);
        _upgradeToAndCallSecure(newImplementation, bytes(""));
    }

    function upgradeToAndCall(address newImplementation, bytes calldata data) external payable virtual {
        _beforeUpgrade(newImplementation);
        _upgradeToAndCallSecure(newImplementation, data, true);
    }

    function _beforeUpgrade(address newImplementation) internal virtual;
}

contract ChildOfProxiable is Proxiable {
    function _beforeUpgrade(address newImplementation) internal virtual override {}
}
