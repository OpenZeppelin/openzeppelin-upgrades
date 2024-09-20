import test from 'ava';
import { EthereumProvider } from './provider';
import { inferProxyAdmin } from './infer-proxy-admin';

const addr = '0x123';

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

test('inferProxyAdmin returns true when owner looks like an address', async t => {
  // abi encoding of address 0x1000000000000000000000000000000000000123
  const provider = makeProviderReturning(
    '0x0000000000000000000000001000000000000000000000000000000000000123',
  );
  t.true(await inferProxyAdmin(provider, addr));
});

test('inferProxyAdmin returns false when owner is more than 20 bytes', async t => {
  const provider = makeProviderReturning(
    '0x0000000000000000000000011000000000000000000000000000000000000123',
  );
  t.false(await inferProxyAdmin(provider, addr));
});

test('inferProxyAdmin returns false when owner is a string', async t => {
  // abi encoding of string 'foo'
  const provider = makeProviderReturning('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000');
  t.false(await inferProxyAdmin(provider, addr));
});

test('inferProxyAdmin throws unrelated error', async t => {
  const provider = makeProviderError('unrelated error');
  await t.throwsAsync(() => inferProxyAdmin(provider, addr), { message: 'unrelated error' });
});

test('inferProxyAdmin returns false for invalid selector', async t => {
  const provider = makeProviderError(
    `Transaction reverted: function selector was not recognized and there's no fallback function`,
  );
  t.false(await inferProxyAdmin(provider, addr));
});
