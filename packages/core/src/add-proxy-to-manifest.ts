import { logWarning, Manifest, ProxyDeployment } from '.';

export async function addProxyToManifest(kind: ProxyDeployment['kind'], proxyAddress: string, manifest: Manifest) {
  const proxyToImport: ProxyDeployment = { kind: kind, address: proxyAddress };
  await manifest.addProxy(proxyToImport);

  if (kind !== 'transparent' && (await manifest.getAdmin())) {
    logWarning(`A proxy admin was previously deployed on this network`, [
      `This is not natively used with the current kind of proxy ('${kind}').`,
      `Changes to the admin will have no effect on this new proxy.`,
    ]);
  }
}
