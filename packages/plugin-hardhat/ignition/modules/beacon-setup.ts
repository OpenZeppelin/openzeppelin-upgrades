import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GreeterImplModule from "./greeter-impl";

/**
 * Deploy UpgradeableBeacon + BeaconProxy for Greeter
 * 
 * Uses GreeterImplModule and deploys beacon + beacon proxy.
 * Does NOT initialize - use deploy-greeter-beacon.ts for that.
 */
export default buildModule("BeaconSetup", (m) => {
  const owner = m.getAccount(0);
  
  // Use implementation module without parameters
  const { implementation } = m.useModule(GreeterImplModule);
  
  // Deploy beacon pointing to implementation
  const beacon = m.contract("UpgradeableBeacon", [
    implementation,
    owner
  ], {
    after: [implementation]
  });
  
  // Deploy beacon proxy pointing to beacon
  const proxy = m.contract("BeaconProxy", [
    beacon,
    "0x" // No initialization data
  ], {
    after: [beacon]
  });
  
  return { proxy, beacon, implementation };
});

