import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploy Greeter implementation
 * 
 * Reusable module for transparent and beacon proxy patterns.
 */
export default buildModule("GreeterImpl", (m) => {
  const implementation = m.contract("Greeter");
  
  return { implementation };
});
