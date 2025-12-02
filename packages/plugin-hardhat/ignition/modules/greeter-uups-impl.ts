import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploy GreeterProxiable (UUPS) implementation
 * 
 * Reusable module for UUPS proxy pattern.
 */
export default buildModule("GreeterUUPSImpl", (m) => {
  const implementation = m.contract("contracts/foundry/GreeterProxiable.sol:GreeterProxiable");
  
  return { implementation };
});
