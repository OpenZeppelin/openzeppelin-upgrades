import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GreeterUUPSImplModule from "./greeter-uups-impl";

/**
 * Deploy ERC1967Proxy (UUPS) for GreeterProxiable
 * 
 * Uses GreeterUUPSImplModule and deploys UUPS proxy.
 * Does NOT initialize - use deploy-greeter-uups.ts for that.
 */
export default buildModule("UUPSProxy", (m) => {
  const owner = m.getAccount(0);
  
  // Use UUPS implementation module without parameters
  const { implementation } = m.useModule(GreeterUUPSImplModule);
  
  // Deploy UUPS proxy pointing to implementation
  const proxy = m.contract("ERC1967Proxy", [
    implementation,
    "0x" // No initialization data
  ], {
    after: [implementation]
  });
  
  return { proxy, implementation, owner };
});

