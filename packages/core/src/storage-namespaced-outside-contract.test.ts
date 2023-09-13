import _test, { TestFn } from 'ava';
import { artifacts } from 'hardhat';

import { validate, RunValidation } from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validation: RunValidation;
}

const test = _test as TestFn<Context>;

test('namespace outside contract', async t => {
  const contract = 'contracts/test/NamespacedOutsideContract.sol:Example';

  const buildInfo = await artifacts.getBuildInfo(contract);
  if (buildInfo === undefined) {
    throw new Error(`Build info not found for contract ${contract}`);
  }
  const solcOutput = buildInfo.output;
  const solcInput = buildInfo.input;
  const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
  const error = t.throws(() => validate(solcOutput, decodeSrc));
  t.assert(
    error?.message.includes(
      'Struct MainStorage in source file contracts/test/NamespacedOutsideContract.sol is defined outside of a contract',
    ),
  );
});
