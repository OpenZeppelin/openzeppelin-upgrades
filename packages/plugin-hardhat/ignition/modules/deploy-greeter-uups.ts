import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import UUPSProxyModule from "./uups-proxy";

/**
 * Deploy GreeterProxiable with UUPS Proxy - Composition Module
 * 
 * Uses UUPSProxyModule and initializes the proxy.
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/deploy-greeter-uups.ts
 * 
 * Parameters:
 * - greeting: Initial greeting message (default: "Hello from UUPS!")
 */
export default buildModule("DeployGreeterUUPS", (m) => {
  const greeting = m.getParameter("greeting", "Hello from UUPS!");
  
  // Use UUPS proxy module without parameters
  const { proxy, owner } = m.useModule(UUPSProxyModule);
  
  // Get typed instance and initialize
  const greeter = m.contractAt("contracts/foundry/GreeterProxiable.sol:GreeterProxiable", proxy);
  m.call(greeter, "initialize", [owner, greeting], { after: [proxy] });
  
  return { greeter, proxy };
});
