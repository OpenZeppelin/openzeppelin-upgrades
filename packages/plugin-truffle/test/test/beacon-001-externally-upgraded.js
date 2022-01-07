const assert = require('assert');

const { deployBeacon, deployBeaconProxy, loadProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2StandaloneImpl = artifacts.require('GreeterV2StandaloneImpl');
const Beacon = artifacts.require('Beacon');

const WAS_NOT_FOUND_IN_MANIFEST = 'was not found in the network manifest';
const BEACON_IMPL_UNKNOWN_REGEX = /Beacon's current implementation at \S+ is unknown/;

// These tests need to run before the other deploy beacon tests so that the beacon implementation will not already be in the manifest.

contract('Greeter', function () {
  it('deploy proxy using beacon address after external beacon upgrade', async function () {
    // beacon with impl 1
    const greeterBeacon = await deployBeacon(Greeter);

    // external impl 2
    const greeter2 = await GreeterV2StandaloneImpl.deployed();

    // external upgrade beacon to impl 2
    await greeterBeacon.upgradeTo(greeter2.address);

    // upgrade beacon to new impl
    await assert.rejects(deployBeaconProxy(greeterBeacon.address, ['Hello Truffle']), error =>
      BEACON_IMPL_UNKNOWN_REGEX.test(error.message),
    );
  });

  it('deploy proxy using proper contract abstraction after external beacon upgrade', async function () {
    // beacon with impl 1
    const greeterBeacon = await deployBeacon(Greeter);

    // external impl 2
    const greeter2 = await GreeterV2StandaloneImpl.deployed();

    // external upgrade beacon to impl 2
    await greeterBeacon.upgradeTo(greeter2.address);

    // deploy beacon proxy to attach to beacon (which points to impl 2)
    const greeterProxy = await deployBeaconProxy(greeterBeacon, ['Hello Truffle'], {
      implementation: GreeterV2StandaloneImpl,
    });
    assert.equal(await greeterProxy.greet(), 'Hello Truffle');
    await greeterProxy.resetGreeting();
    assert.equal(await greeterProxy.greet(), 'Hello World');
  });

  it('load proxy with address after external beacon upgrade', async function () {
    // beacon with impl 1
    const greeterBeacon = await deployBeacon(Greeter);

    // deploy beacon proxy to attach to beacon (which points to impl 1)
    const greeterProxy = await deployBeaconProxy(greeterBeacon, ['Hello Truffle']);

    // external impl 2
    const greeter2 = await GreeterV2StandaloneImpl.deployed();

    // external upgrade beacon to impl 2
    const beaconContract = await Beacon.at(greeterBeacon.address);
    await beaconContract.upgradeTo(greeter2.address);

    await assert.rejects(loadProxy(greeterProxy.address), error => error.message.includes(WAS_NOT_FOUND_IN_MANIFEST));
  });

  it('load proxy with contract instance after external beacon upgrade', async function () {
    // beacon with impl 1
    const greeterBeacon = await deployBeacon(Greeter);

    // deploy beacon proxy to attach to beacon (which points to impl 1)
    const greeterProxy = await deployBeaconProxy(greeterBeacon, ['Hello Truffle']);

    // external impl 2
    const greeter2 = await GreeterV2StandaloneImpl.deployed();

    // external upgrade beacon to impl 2
    const beaconContract = await Beacon.at(greeterBeacon.address);
    await beaconContract.upgradeTo(greeter2.address);

    await assert.rejects(loadProxy(greeterProxy), error => error.message.includes(WAS_NOT_FOUND_IN_MANIFEST));
  });

  it('manually attach to proxy after external beacon upgrade', async function () {
    // beacon with impl 1
    const greeterBeacon = await deployBeacon(Greeter);

    // deploy beacon proxy to attach to beacon (which points to impl 1)
    const greeterProxy = await deployBeaconProxy(greeterBeacon, ['Hello Truffle']);

    // external impl 2
    const greeter2 = await GreeterV2StandaloneImpl.deployed();

    // external upgrade beacon to impl 2
    const beaconContract = await Beacon.at(greeterBeacon.address);
    await beaconContract.upgradeTo(greeter2.address);

    // manually attach to proxy address
    const manualAttach = await GreeterV2StandaloneImpl.at(greeterProxy.address);
    assert.equal(await manualAttach.greet(), 'Hello Truffle');
    await manualAttach.resetGreeting();
    assert.equal(await manualAttach.greet(), 'Hello World');
  });
});
