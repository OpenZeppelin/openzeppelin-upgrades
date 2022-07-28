import { ContractClass, getDeployData, ValidateImplementationOptions } from './utils';
import { validateImpl } from './utils/validate-impl';

export async function validateImplementation(
  Contract: ContractClass,
  opts: ValidateImplementationOptions = {},
): Promise<void> {
  const deployData = await getDeployData(opts, Contract);
  await validateImpl(deployData, opts);
}
