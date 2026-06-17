import type { EthereumProvider } from 'hardhat/types/providers';
import { getTransactionReceipt, isReceiptSuccessful, UpgradesError } from '@openzeppelin/upgrades-core';

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
 *
 * A mined receipt is accepted only when it reports success, reusing `@openzeppelin/upgrades-core`'s
 * `getTransactionReceipt` (which normalizes the status) and `isReceiptSuccessful` (success iff
 * `status === '0x1'`) — the same revert check core uses when validating deployments. Any mined
 * receipt that is not successful — a revert (`0x0`) or a missing/unknown status that cannot be
 * confirmed — is treated as a failure, rather than optimistically assumed to have succeeded.
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
    // `getTransactionReceipt` returns null while the transaction is still pending, and normalizes
    // the receipt's status when it is mined.
    const receipt = await getTransactionReceipt(provider, txHash);
    if (receipt !== null) {
      if (!isReceiptSuccessful(receipt)) {
        throw new UpgradesError(
          `The transaction ${txHash} to deploy or upgrade a contract was not successful`,
          () => 'The transaction was reverted, or the network did not report a successful status for it.',
        );
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
