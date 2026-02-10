import type { TaskOverrideActionFunction } from 'hardhat/types/tasks';
import { verify } from './verify-proxy.js';

const action: TaskOverrideActionFunction = async (taskArguments, hre, runSuper) => {
  return verify(taskArguments as Record<string, unknown>, hre, runSuper);
};

export default action;
