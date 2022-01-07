const assert = require('assert');

const { deployBeacon, deployBeaconProxy, upgradeBeacon, prepareUpgrade } = require('@openzeppelin/truffle-upgrades');

const GreeterBeaconImpl = artifacts.require('GreeterBeaconImpl');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterV3 = artifacts.require('GreeterV3');

const TX_HASH_MISSING = 'transaction hash is missing';

contract('GreeterBeaconImpl', function () {
  it('infer beacon proxy', async function () {
    const greeter = await GreeterBeaconImpl.deployed();
    assert.strictEqual(await greeter.greet(), 'Hello Truffle');
  });

  it('deployBeaconProxy', async function () {
    const greeterBeacon = await deployBeacon(GreeterBeaconImpl);
    assert.ok(greeterBeacon.transactionHash, TX_HASH_MISSING);
    const greeter = await deployBeaconProxy(greeterBeacon, GreeterBeaconImpl, ['Hello Truffle']);
    assert.ok(greeter.transactionHash, TX_HASH_MISSING);
    assert.notEqual(greeter.transactionHash, greeterBeacon.transactionHash);
    assert.equal(await greeter.greet(), 'Hello Truffle');

    const greeterSecond = await deployBeaconProxy(greeterBeacon, GreeterBeaconImpl, ['Hello Truffle second']);
    assert.ok(greeterSecond.transactionHash, TX_HASH_MISSING);
    assert.notEqual(greeterSecond.transactionHash, greeter.transactionHash);
    assert.equal(await greeterSecond.greet(), 'Hello Truffle second');

    //  new impl
    const upgradedBeacon = await upgradeBeacon(greeterBeacon, GreeterV2);
    assert.ok(upgradedBeacon.transactionHash, TX_HASH_MISSING);
    assert.notEqual(upgradedBeacon.transactionHash, greeterBeacon.transactionHash);

    // reload proxy to work with the new contract
    const greeter2 = await GreeterV2.at(greeter.address);
    assert.equal(await greeter2.greet(), 'Hello Truffle');
    await greeter2.resetGreeting();
    assert.equal(await greeter2.greet(), 'Hello World');

    // reload proxy to work with the new contract
    const greeterSecond2 = await GreeterV2.at(greeterSecond.address);
    assert.equal(await greeterSecond2.greet(), 'Hello Truffle second');
    await greeterSecond2.resetGreeting();
    assert.equal(await greeterSecond2.greet(), 'Hello World');

    // prepare upgrade from beacon proxy
    const greeter3ImplAddr = await prepareUpgrade(greeter.address, GreeterV3);
    const greeter3 = await GreeterV3.at(greeter3ImplAddr);
    const version3 = await greeter3.version();
    assert.equal(version3, 'V3');

    // prepare upgrade from beacon itself
    const greeter3ImplAddrFromBeacon = await prepareUpgrade(greeterBeacon.address, GreeterV3);
    const greeter3FromBeacon = await GreeterV3.at(greeter3ImplAddrFromBeacon);
    const version3FromBeacon = await greeter3FromBeacon.version();
    assert.equal(version3FromBeacon, 'V3');
  });
});
