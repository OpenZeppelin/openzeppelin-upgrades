import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import BeaconSetupModule from "./beacon-setup";

/**
 * Deploy Greeter with Beacon Proxy - Composition Module
 * 
 * Uses BeaconSetupModule and initializes the proxy.
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/deploy-greeter-beacon.ts
 * 
 * Parameters:
 * - greeting: Initial greeting message (default: "Hello from Beacon!")
 */
export default buildModule("DeployGreeterBeacon", (m) => {
  const greeting = m.getParameter("greeting", "Hello from Beacon!");
  
  // Use beacon setup module without parameters
  const { proxy } = m.useModule(BeaconSetupModule);
  
  // Get typed instance and initialize
  const greeter = m.contractAt("Greeter", proxy);
  m.call(greeter, "initialize", [greeting], { after: [proxy] });
  
  return { greeter, proxy };
});
