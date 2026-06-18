import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('implementation deploy is confirmed by upgrades-core, not while holding the manifest lock', async t => {
  // Pause mining so the implementation deployment cannot confirm. The viem binding broadcasts the
  // deployment and returns immediately (predicting the address), so the engine records it and then
  // waits for confirmation through @openzeppelin/upgrades-core, outside the manifest lock. A too-low
  // timeout therefore surfaces core's implementation-deployment timeout — the same message the
  // ethers-based API produces — rather than the binding's own receipt timeout. If the binding waited
  // for the receipt itself (holding the manifest lock during mining), this would surface a different
  // message. redeployImplementation:'always' forces a fresh deployment regardless of any
  // implementation already recorded in the shared manifest.
  const provider = connection.provider;
  const snapshotId = await provider.send('evm_snapshot', []);
  const automine = await provider.send('hardhat_getAutomine', []);
  await provider.send('evm_setAutomine', [false]);
  try {
    const error = await t.throwsAsync(() =>
      upgrades.deployImplementation('Greeter', {
        redeployImplementation: 'always',
        timeout: 1,
        pollingInterval: 0,
      }),
    );
    t.true(error.message.includes('Timed out waiting for implementation contract deployment'), error.message);
  } finally {
    await provider.send('evm_setAutomine', [automine]);
    await provider.send('evm_revert', [snapshotId]);
  }
});
