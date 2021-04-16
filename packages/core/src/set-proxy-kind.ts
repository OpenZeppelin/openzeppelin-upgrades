import { EthereumProvider } from './provider';
import { ValidationOptions } from './validate';
import { Manifest, DeploymentNotFound, ProxyDeployment } from './manifest';

export async function setProxyKind(
  provider: EthereumProvider,
  proxyAddress: string,
  opts: ValidationOptions,
): Promise<ProxyDeployment['kind']> {
  const manifest = await Manifest.forNetwork(provider);

  const manifestDeployment = await manifest.getProxyFromAddress(proxyAddress).catch(e => {
    if (e instanceof DeploymentNotFound) {
      return undefined;
    } else {
      throw e;
    }
  });

  if (opts.kind === undefined) {
    opts.kind = manifestDeployment?.kind ?? 'transparent';
  } else if (manifestDeployment && opts.kind !== manifestDeployment.kind) {
    throw new Error(`Requested an upgrade of kind ${opts.kind} but proxy is ${manifestDeployment.kind}`);
  }

  return opts.kind;
}
