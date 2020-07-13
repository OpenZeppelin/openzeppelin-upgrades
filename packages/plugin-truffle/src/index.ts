interface Options {
  deployer: any;
}

export async function deployProxy(contract: any, args: unknown[], opts: Options) {
  const { deployer } = opts;

  return deployer.deploy(contract, ...args);
}
