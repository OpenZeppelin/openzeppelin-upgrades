const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('GreeterProxiable');
const GreeterStorageConflict = artifacts.require('GreeterStorageConflictProxiable');

it('incompatible storage', async function () {
  const greeter = await deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await assert.rejects(
    () => upgradeProxy(greeter, GreeterStorageConflict),
    error => error.message.includes('New storage layout is incompatible'),
  );
});

it('incompatible storage - forced', async function () {
  const greeter = await deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await upgradeProxy(greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
});
