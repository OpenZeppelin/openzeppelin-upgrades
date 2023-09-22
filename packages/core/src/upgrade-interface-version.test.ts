import test from 'ava';
import { EthereumProvider } from './provider';
import { getUpgradeInterfaceVersion } from './upgrade-interface-version';

const hash = '0x1234';

function makeProviderReturning(result: unknown): EthereumProvider {
  return { send: (_method: string, _params: unknown[]) => Promise.resolve(result) } as EthereumProvider;
}

function makeProviderError(msg: string): EthereumProvider {
  return {
    send: (_method: string, _params: unknown[]) => {
      throw new Error(msg);
    },
  } as EthereumProvider;
}

test('getUpgradeInterfaceVersion returns version', async t => {
  const provider = makeProviderReturning('5.0.0');
  t.is(await getUpgradeInterfaceVersion(provider, hash), '5.0.0');
});

test('getUpgradeInterfaceVersion throws unrelated error', async t => {
  const provider = makeProviderError('unrelated error');
  await t.throwsAsync(() => getUpgradeInterfaceVersion(provider, hash), { message: 'unrelated error' });
});

test('getUpgradeInterfaceVersion returns undefined for invalid selector', async t => {
  const provider = makeProviderError(
    `Transaction reverted: function selector was not recognized and there's no fallback function`,
  );
  t.is(await getUpgradeInterfaceVersion(provider, hash), undefined);
});
