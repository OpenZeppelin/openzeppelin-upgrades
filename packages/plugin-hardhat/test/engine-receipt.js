import test from 'ava';

import { waitForReceipt } from '../dist/engine/receipt.js';

// Minimal EIP-1193-like provider that returns a scripted sequence of `eth_getTransactionReceipt`
// responses (null = still pending). The last entry repeats once the sequence is exhausted.
function fakeProvider(...sequence) {
  let i = 0;
  return {
    async send(method, params) {
      if (method !== 'eth_getTransactionReceipt') {
        throw new Error(`unexpected method ${method}`);
      }
      const response = sequence[Math.min(i, sequence.length - 1)];
      i += 1;
      // Return a fresh copy so the helper's status normalization doesn't mutate the script.
      return response === null ? null : { ...response };
    },
  };
}

const fast = { pollingInterval: 1, timeout: 1000 };

test('resolves with the receipt once mined and successful', async t => {
  const provider = fakeProvider(null, {
    status: '0x1',
    contractAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0xhash',
  });
  const receipt = await waitForReceipt(provider, '0xhash', fast);
  t.is(receipt.contractAddress, '0x1234567890123456789012345678901234567890');
});

test('normalizes a zero-padded success status (0x01)', async t => {
  const provider = fakeProvider({ status: '0x01', transactionHash: '0xhash' });
  await t.notThrowsAsync(() => waitForReceipt(provider, '0xhash', fast));
});

test('throws when the transaction reverted (status 0x0)', async t => {
  const provider = fakeProvider({ status: '0x0', transactionHash: '0xhash' });
  await t.throwsAsync(() => waitForReceipt(provider, '0xhash', fast), { message: /was not successful/ });
});

test('throws when a mined receipt has a null status (cannot confirm success)', async t => {
  const provider = fakeProvider({ status: null, transactionHash: '0xhash' });
  await t.throwsAsync(() => waitForReceipt(provider, '0xhash', fast), { message: /was not successful/ });
});

test('throws when a mined receipt is missing the status field', async t => {
  const provider = fakeProvider({ transactionHash: '0xhash' });
  await t.throwsAsync(() => waitForReceipt(provider, '0xhash', fast), { message: /was not successful/ });
});

test('times out if the transaction never mines', async t => {
  const provider = fakeProvider(null);
  await t.throwsAsync(() => waitForReceipt(provider, '0xhash', { pollingInterval: 1, timeout: 5 }), {
    message: /Timed out/,
  });
});
