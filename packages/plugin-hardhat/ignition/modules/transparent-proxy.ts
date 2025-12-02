import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GreeterImplModule from "./greeter-impl";

/**
 * Deploy TransparentUpgradeableProxy for Greeter
 * 
 * Uses GreeterImplModule and deploys proxy pointing to it.
 * Does NOT initialize - use deploy-greeter-transparent.ts for that.
 */
export default buildModule("TransparentProxy", (m) => {
  const owner = m.getAccount(0);
  
  // Use implementation module without parameters
  const { implementation } = m.useModule(GreeterImplModule);
  
  // Deploy proxy pointing to implementation
  const proxy = m.contract("TransparentUpgradeableProxy", [
    implementation,
    owner,
    "0x" // No initialization data
  ], {
    after: [implementation]
  });
  
  return { proxy, implementation };
});

