const assert = require('assert');
const {
  deployProxy,
  upgradeProxy,
  prepareUpgrade,
  deployBeacon,
  deployBeaconProxy,
  upgradeBeacon,
} = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');
const GreeterStandaloneImpl = artifacts.require('GreeterStandaloneImpl');
const GreeterFallback = artifacts.require('GreeterFallback');

const BEACON_PROXY_NOT_SUPPORTED = 'Beacon proxies are not supported with the current function';
const ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY = 'Address is a transparent or UUPS proxy';
const ADDRESS_IS_A_BEACON_PROXY = 'Address is a beacon proxy which cannot be upgraded directly.';
const PROXY_KIND_UUPS_NOT_SUPPORTED = "Unsupported proxy kind 'uups'";
const NOT_REGISTERED_REGEX = /Deployment at address \S+ is not registered/;
const NOT_BEACON = /Contract at \S+ doesn't look like a beacon/;
const MUST_SPECIFY_CONTRACT_ABSTRACTION = 'attachTo must specify a contract abstraction';

contract('Greeter', function () {
  it('block beacon proxy deploy via deployProxy', async function () {
    await assert.rejects(deployProxy(Greeter, ['Hello Truffle'], { kind: 'beacon' }), error =>
      error.message.includes(BEACON_PROXY_NOT_SUPPORTED),
    );
  });

  it('block beacon upgrade via upgradeProxy', async function () {
    const beacon = await deployBeacon(Greeter);
    const greeter = await deployBeaconProxy(beacon, Greeter, ['Hello Truffle']);

    await assert.rejects(upgradeProxy(greeter, GreeterV2), error => error.message.includes(BEACON_PROXY_NOT_SUPPORTED));
  });

  it('block beacon proxy upgrade via upgradeBeacon', async function () {
    const beacon = await deployBeacon(Greeter);
    const greeter = await deployBeaconProxy(beacon, Greeter, ['Hello Truffle']);

    await assert.rejects(upgradeBeacon(greeter, GreeterV2), error => error.message.includes(ADDRESS_IS_A_BEACON_PROXY));
  });

  it('block transparent proxy upgrade via upgradeBeacon', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });

    await assert.rejects(upgradeBeacon(greeter, GreeterV2), error =>
      error.message.includes(ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY),
    );
  });

  it('block uups proxy upgrade via upgradeBeacon', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello Truffle'], { kind: 'uups' });

    await assert.rejects(upgradeBeacon(greeter, GreeterV2Proxiable), error =>
      error.message.includes(ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY),
    );
  });

  it('block deployBeaconProxy with non-beacon kind', async function () {
    const beacon = await deployBeacon(Greeter);

    await assert.rejects(deployBeaconProxy(beacon, Greeter, ['Hello Truffle'], { kind: 'uups' }), error =>
      error.message.includes(PROXY_KIND_UUPS_NOT_SUPPORTED),
    );
  });

  it('block deployBeaconProxy with non-beacon address', async function () {
    const genericContract = await GreeterStandaloneImpl.deployed();

    await assert.rejects(deployBeaconProxy(genericContract, GreeterStandaloneImpl, ['Hello Truffle']), error =>
      NOT_BEACON.test(error.message),
    );
  });

  it('block prepareUpgrade on generic contract', async function () {
    const genericContract = await GreeterStandaloneImpl.deployed();

    await assert.rejects(prepareUpgrade(genericContract, GreeterV2, { kind: 'transparent' }), error =>
      NOT_REGISTERED_REGEX.test(error.message),
    );
  });

  it('block prepareUpgrade on generic contract with fallback', async function () {
    const genericContract = await GreeterFallback.deployed();

    await assert.rejects(prepareUpgrade(genericContract, GreeterV2, { kind: 'transparent' }), error =>
      NOT_REGISTERED_REGEX.test(error.message),
    );
  });

  it('block deployBeaconProxy without attachTo with args', async function () {
    const beacon = await deployBeacon(Greeter);
    await assert.rejects(deployBeaconProxy(beacon, ['Hello Truffle']), error =>
      error.message.includes(MUST_SPECIFY_CONTRACT_ABSTRACTION),
    );
  });

  it('block deployBeaconProxy without attachTo without args', async function () {
    const beacon = await deployBeacon(Greeter);
    await assert.rejects(deployBeaconProxy(beacon), error => error.message.includes(MUST_SPECIFY_CONTRACT_ABSTRACTION));
  });
});
