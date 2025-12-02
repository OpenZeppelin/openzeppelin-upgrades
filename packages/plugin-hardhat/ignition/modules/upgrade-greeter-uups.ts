import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Upgrade existing GreeterProxiable UUPS proxy
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/upgrade-greeter-uups.ts \
 *     --parameters '{"UpgradeGreeterUUPS":{"proxyAddress":"0x...","newImplementationAddress":"0x..."}}'
 * 
 * Parameters:
 * - proxyAddress: Existing proxy address to upgrade
 * - newImplementationAddress: Address of the new implementation contract
 */
export default buildModule("UpgradeGreeterUUPS", (m) => {
  const proxyAddress = m.getParameter("proxyAddress");
  const newImplementationAddress = m.getParameter("newImplementationAddress");
  
  // Get contract instance at proxy address
  const proxy = m.contractAt("contracts/foundry/GreeterProxiable.sol:GreeterProxiable", proxyAddress);
  
  // Call upgradeTo function
  m.call(proxy, "upgradeTo", [newImplementationAddress], {
    after: [proxy]
  });
  
  return { proxy };
});

