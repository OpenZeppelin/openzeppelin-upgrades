import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import TransparentProxyModule from "./transparent-proxy";

/**
 * Deploy Greeter with Transparent Proxy - Composition Module
 * 
 * Uses TransparentProxyModule and initializes the proxy.
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/deploy-greeter-transparent.ts
 * 
 * Parameters:
 * - greeting: Initial greeting message (default: "Hello from Transparent!")
 */
export default buildModule("DeployGreeterTransparent", (m) => {
  const greeting = m.getParameter("greeting", "Hello from Transparent!");
  
  // Use proxy module without parameters
  const { proxy } = m.useModule(TransparentProxyModule);
  
  // Get typed instance and initialize
  const greeter = m.contractAt("Greeter", proxy);
  m.call(greeter, "initialize", [greeting], { after: [proxy] });
  
  return { greeter, proxy };
});
