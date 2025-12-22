// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TokenV2
 * @dev Upgraded version of the token using AccessControl instead of Ownable.
 * This contract demonstrates how to migrate from Ownable to AccessControl while
 * preserving the contract's state and functionality.
 */
contract TokenV2 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ERC20PermitUpgradeable {
    /// @dev The role identifier for minters
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with an admin address.
     * Note: This function signature differs from V1, which is why we use
     * a migration function instead of reinitializing.
     * @param initialAdmin The address that will have admin and minter roles
     */
    function initialize(address initialAdmin) public initializer {
        __ERC20_init("MyToken", "MTK");
        __AccessControl_init();
        __ERC20Permit_init("MyToken");
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
    }

    /**
     * @notice Migrates from Ownable (V1) to AccessControl (V2).
     * This function is called during the upgrade process to grant the previous
     * owner the appropriate roles in the new access control system.
     * 
     * @param previousOwner The owner address from V1 to grant admin/minter roles
     * 
     * @dev Uses reinitializer(2) because:
     * - The contract was already initialized once in V1 (initializer)
     * - This is the second initialization (reinitializer(2))
     * - We only initialize AccessControl here, not ERC20 or Permit (already initialized)
     */
    function migrateFromV1(address previousOwner) public reinitializer(2) {
        // Initialize AccessControl (ERC20 and Permit were already initialized in V1)
        __AccessControl_init();
        
        // Grant the previous owner both admin and minter roles
        _grantRole(DEFAULT_ADMIN_ROLE, previousOwner);
        _grantRole(MINTER_ROLE, previousOwner);
    }

    /**
     * @dev Mints tokens to a specified address. Only addresses with MINTER_ROLE can call this.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

