const assert = require('assert');

const {
  deployProxy,
  deployBeacon,
  validateImplementation,
  deployImplementation,
  validateUpgrade,
  erc1967,
} = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');
const Invalid = artifacts.require('Invalid');
const GreeterStorageConflict = artifacts.require('GreeterStorageConflict');
const GreeterStorageConflictProxiable = artifacts.require('GreeterStorageConflictProxiable');

function getUpgradeUnsafeRegex(contractName) {
  return new RegExp(`Contract \`.*:${contractName}\` is not upgrade safe`);
}

contract('Greeter', function () {
  it('validate implementation - happy paths', async function () {
    await validateImplementation(Greeter);
    await validateImplementation(Greeter, { kind: 'transparent' });
    await validateImplementation(Greeter, { kind: 'beacon' });
    await validateImplementation(GreeterProxiable);
    await validateImplementation(GreeterProxiable, { kind: 'uups' });
  });

  it('validate implementation - invalid', async function () {
    await assert.rejects(validateImplementation(Invalid), error =>
      getUpgradeUnsafeRegex('Invalid').test(error.message),
    );
  });

  it('validate implementation uups - no upgrade function', async function () {
    await assert.rejects(validateImplementation(Greeter, { kind: 'uups' }), error =>
      getUpgradeUnsafeRegex('Greeter').test(error.message),
    );
  });

  it('deploy implementation - happy path', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeter = await Greeter.at(greeterImplAddr);
    await greeter.greet();
  });

  it('deploy implementation - multiple times', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeterImplAddrB = await deployImplementation(Greeter);
    assert.equal(greeterImplAddr, greeterImplAddrB);

    const greeterImplAddr2 = await deployImplementation(GreeterV2);
    assert.notEqual(greeterImplAddr, greeterImplAddr2);
  });

  it('deploy implementation - before proxy deployment', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter.address));
  });

  it('deploy implementation - after proxy deployment', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    const greeterImplAddr = await deployImplementation(Greeter);
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter.address));
  });

  it('deploy implementation - invalid', async function () {
    await assert.rejects(deployImplementation(Invalid), error => getUpgradeUnsafeRegex('Invalid').test(error.message));
  });

  it('deploy implementation uups - no upgrade function', async function () {
    await assert.rejects(deployImplementation(Greeter, { kind: 'uups' }), error =>
      getUpgradeUnsafeRegex('Greeter').test(error.message),
    );
  });

  it('validate upgrade beacon - happy path', async function () {
    const beacon = await deployBeacon(Greeter);
    await validateUpgrade(beacon, GreeterV2);
  });

  it('validate upgrade beacon - incompatible storage', async function () {
    const beacon = await deployBeacon(Greeter);
    await assert.rejects(validateUpgrade(beacon, GreeterStorageConflict), error =>
      error.message.includes('New storage layout is incompatible'),
    );
  });

  it('validate upgrade beacon - incompatible storage - forced', async function () {
    const beacon = await deployBeacon(Greeter);
    await validateUpgrade(beacon, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

  it('validate transparent - happy path', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await validateUpgrade(greeter, GreeterV2);
  });

  it('validate upgrade transparent - incompatible storage', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await assert.rejects(validateUpgrade(greeter, GreeterStorageConflict), error =>
      error.message.includes('New storage layout is incompatible'),
    );
  });

  it('validate upgrade transparent - incompatible storage - forced', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await validateUpgrade(greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

  it('validate uups - happy path', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await validateUpgrade(greeter, GreeterV2Proxiable);
  });

  it('validate upgrade uups - incompatible storage', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await assert.rejects(validateUpgrade(greeter, GreeterStorageConflictProxiable), error =>
      error.message.includes('New storage layout is incompatible'),
    );
  });

  it('validate upgrade uups - incompatible storage - forced', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await validateUpgrade(greeter, GreeterStorageConflictProxiable, { unsafeSkipStorageCheck: true });
  });

  it('validate upgrade uups - wrong kind', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
    await assert.rejects(validateUpgrade(greeter, GreeterV2), error =>
      error.message.includes('Requested an upgrade of kind transparent but proxy is uups'),
    );
  });

  it('validate upgrade uups - no upgrade function', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
    await assert.rejects(validateUpgrade(greeter, GreeterV2, { kind: 'uups' }), error =>
      getUpgradeUnsafeRegex('GreeterV2').test(error.message),
    );
  });

  it('validate upgrade - contracts only - happy paths', async function () {
    await validateUpgrade(Greeter, GreeterV2);
    await validateUpgrade(GreeterProxiable, GreeterV2Proxiable);
  });

  it('validate upgrade - contracts only - incompatible storage', async function () {
    await assert.rejects(validateUpgrade(Greeter, GreeterStorageConflict), error =>
      error.message.includes('New storage layout is incompatible'),
    );
  });

  it('validate upgrade - contracts only - incompatible storage - forced', async function () {
    await validateUpgrade(Greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

  it('validate upgrade - uups contracts only - uups inferred - no upgrade function', async function () {
    await assert.rejects(validateUpgrade(GreeterProxiable, GreeterV2), error =>
      getUpgradeUnsafeRegex('GreeterV2').test(error.message),
    );
  });

  it('validate upgrade - uups contracts only - uups - no upgrade function', async function () {
    await assert.rejects(validateUpgrade(GreeterProxiable, GreeterV2, { kind: 'uups' }), error =>
      getUpgradeUnsafeRegex('GreeterV2').test(error.message),
    );
  });

  it('validate upgrade on deployed implementation - happy paths', async function () {
    const greeter = await deployImplementation(Greeter);
    await validateUpgrade(greeter, GreeterV2, { kind: 'transparent' });

    const greeterUUPS = await deployImplementation(GreeterProxiable);
    await validateUpgrade(greeterUUPS, GreeterV2Proxiable, { kind: 'uups' });
  });

  it('validate upgrade on deployed implementation - incompatible storage', async function () {
    const greeter = await deployImplementation(Greeter);
    await assert.rejects(validateUpgrade(greeter, GreeterStorageConflict, { kind: 'transparent' }), error =>
      error.message.includes('New storage layout is incompatible'),
    );
  });

  it('validate upgrade on deployed implementation - incompatible storage - forced', async function () {
    const greeter = await deployImplementation(Greeter);
    await validateUpgrade(greeter, GreeterStorageConflict, { kind: 'transparent', unsafeSkipStorageCheck: true });
  });

  it('validate upgrade on deployed implementation - no kind', async function () {
    const greeter = await deployImplementation(GreeterProxiable);
    await assert.rejects(validateUpgrade(greeter, GreeterV2), error =>
      error.message.includes('The `kind` option must be provided'),
    );
  });

  it('validate upgrade on deployed implementation - kind uups - no upgrade function', async function () {
    const greeter = await deployImplementation(GreeterProxiable);
    await assert.rejects(validateUpgrade(greeter, GreeterV2, { kind: 'uups' }), error =>
      getUpgradeUnsafeRegex('GreeterV2').test(error.message),
    );
  });
});
