const assert = require('assert');

const { deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const GreeterStandaloneImpl = artifacts.require('GreeterStandaloneImpl');
const GreeterV2 = artifacts.require('GreeterV2');
const Beacon = artifacts.require('Beacon');

const IS_NOT_REGISTERED = 'is not registered';
const BEACON_IMPL_UNKNOWN_REGEX = /Beacon's current implementation at \S+ is unknown/;

// These tests need to run before the other deploy beacon tests so that the beacon implementation will not already be in the manifest.

contract('GreeterStandaloneImpl', function () {
  it('block upgrade to unregistered beacon', async function () {
    // deploy beacon without upgrades plugin
    const greeter = await GreeterStandaloneImpl.deployed();
    const beacon = await Beacon.new(greeter.address);

    // upgrade beacon to new impl
    await assert.rejects(upgradeBeacon(beacon.address, GreeterV2), error => error.message.includes(IS_NOT_REGISTERED));
  });

  it('add proxy to unregistered beacon using contract implementation', async function () {
    // deploy beacon without upgrades plugin
    const greeter = await GreeterStandaloneImpl.deployed();
    const beacon = await Beacon.new(greeter.address);

    // add proxy to beacon
    const greeterProxy = await deployBeaconProxy(beacon.address, ['Hello, proxy!'], {
      implementation: GreeterStandaloneImpl,
    });
    assert.equal(await greeterProxy.greet(), 'Hello, proxy!');
  });

  it('add proxy to unregistered beacon without contract implementation', async function () {
    // deploy beacon without upgrades plugin
    const greeter = await GreeterStandaloneImpl.deployed();
    const beacon = await Beacon.new(greeter.address);

    // add proxy to beacon
    await assert.rejects(deployBeaconProxy(beacon.address, ['Hello, proxy!']), error =>
      BEACON_IMPL_UNKNOWN_REGEX.test(error.message),
    );
  });
});
