// test/helpers.js
export const mockDeploy = async (hre, opts, factory, ...args) => {
  // Do a regular ethers deploy
  if (opts.txOverrides !== undefined) {
    args.push(opts.txOverrides);
  }
  const contractInstance = await factory.deploy(...args);
  const deployTransaction = contractInstance.deploymentTransaction();
  const address = await contractInstance.getAddress();
  const txHash = deployTransaction.hash;
  
  return {
    address,
    txHash,
    deployTransaction,
    remoteDeploymentId: 'abc',
  };
};
