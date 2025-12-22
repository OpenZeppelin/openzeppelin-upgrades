// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TokenV2
 * @dev Upgraded version using AccessControl instead of Ownable, with UUPS proxy pattern.
 * This contract demonstrates how to migrate from Ownable to AccessControl while
 * preserving the contract's state and functionality.
 */
contract TokenV2 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable {
    /// @dev The role identifier for minters
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// @dev The role identifier for upgraders
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with admin, minter, and upgrader addresses.
     * Note: This function signature differs from V1, which is why we use
     * a migration function instead of reinitializing.
     * @param defaultAdmin The address that will have admin role
     * @param minter The address that will have minter role
     * @param upgrader The address that will have upgrader role
     */
    function initialize(address defaultAdmin, address minter, address upgrader) public initializer {
        __ERC20_init("MyToken", "MTK");
        __AccessControl_init();
        __ERC20Permit_init("MyToken");
        
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);
    }

    /**
     * @notice Migrates from Ownable (V1) to AccessControl (V2).
     * This function is called during the upgrade process to grant the previous
     * owner the appropriate roles in the new access control system.
     * 
     * @param previousOwner The owner address from V1 to grant admin/minter/upgrader roles
     * 
     * @dev Uses reinitializer(2) because:
     * - The contract was already initialized once in V1 (initializer)
     * - This is the second initialization (reinitializer(2))
     * - We only initialize AccessControl here, not ERC20, Permit, or UUPS (already initialized)
     */
    function migrateFromV1(address previousOwner) public reinitializer(2) {
        // Initialize AccessControl (ERC20, Permit, and UUPS were already initialized in V1)
        __AccessControl_init();
        
        // Grant the previous owner all necessary roles
        _grantRole(DEFAULT_ADMIN_ROLE, previousOwner);
        _grantRole(MINTER_ROLE, previousOwner);
        _grantRole(UPGRADER_ROLE, previousOwner);
    }

    /**
     * @dev Mints tokens to a specified address. Only addresses with MINTER_ROLE can call this.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Authorizes upgrades. Only addresses with UPGRADER_ROLE can upgrade the contract.
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
