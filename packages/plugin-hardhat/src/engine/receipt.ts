import type { EthereumProvider } from 'hardhat/types/providers';
import { UpgradesError } from '@openzeppelin/upgrades-core';

interface RpcTransactionReceipt {
  status?: string;
  contractAddress?: string | null;
  transactionHash: string;
}

/**
 * Waits for a transaction receipt by polling the connection's EIP-1193 provider directly. On the
 * in-process auto-mining network this resolves immediately, and on real networks it polls at the
 * configured interval — so the engine owns its transaction-waiting semantics without depending on
 * any client library's provider polling behavior.
 */
export async function waitForReceipt(
  provider: EthereumProvider,
  txHash: string,
  opts: { pollingInterval?: number; timeout?: number } = {},
): Promise<RpcTransactionReceipt> {
  const pollingInterval = opts.pollingInterval ?? 5e3;
  const timeout = opts.timeout ?? 60e3;
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const receipt: RpcTransactionReceipt | null = await provider.send('eth_getTransactionReceipt', [txHash]);
    if (receipt !== null) {
      if (receipt.status !== undefined && Number(receipt.status) === 0) {
        throw new UpgradesError(`Transaction ${txHash} to deploy or upgrade a contract reverted`);
      }
      return receipt;
    }
    if (timeout !== 0 && Date.now() - start > timeout) {
      throw new UpgradesError(
        `Timed out waiting for transaction ${txHash}`,
        () => 'Increase the timeout with the `timeout` option, or set it to `0` to wait indefinitely.',
      );
    }
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
  }
}
