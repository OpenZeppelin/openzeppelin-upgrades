const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { AdminClient } = require('defender-admin-client');

const address = '0x0dB58eF1B0F7Bb3d70177bcBFd31BC557fbE8b2A';
const artifactUri = 'http://example.com/artifact.json';

const greeterV3DeployedBytecode =
  '6080604052348015600f57600080fd5b506004361060285760003560e01c806354fd4d5014602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b60007f000000000000000000000000000000000000000000000000000000000000000090509056fea2646970667358221220b84390da06820294a9ec14881a611a5c12b610c096d7fd6f384b9c2ac3eff53764736f6c63430006070033';
const greeterV3Digest = '4b762bb0f39501e285fd24e32f4c5ea9be54c791a5acccb3b62bd67d932353c4';
const greeterV3ImmutableReferences = { 40: [{ length: 32, start: 77 }] };

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';

  const verifyDeploymentModule = proxyquire('../dist/verify-deployment', {
    './utils': {
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeClient,
    },
  });

  t.context.verifyDeployment = verifyDeploymentModule.makeVerifyDeploy(hre);
  t.context.verifyDeploymentWithUploadedArtifact = verifyDeploymentModule.makeVerifyDeployWithUploadedArtifact(hre);
  t.context.getVerifyDeployArtifact = verifyDeploymentModule.makeGetVerifyDeployArtifact(hre);
  t.context.getVerifyDeployBuildInfo = verifyDeploymentModule.makeGetVerifyDeployBuildInfo(hre);
  t.context.getBytecodeDigest = verifyDeploymentModule.makeGetBytecodeDigest(hre);
});

test.afterEach.always(() => {
  sinon.restore();
});

test('verifies deployment uploading artifact', async t => {
  const { verifyDeployment, fakeClient } = t.context;
  const verificationResult = { matchType: 'EXACT' };
  fakeClient.verifyDeployment.resolves(verificationResult);

  const result = await verifyDeployment(address, 'GreeterV3', artifactUri);

  t.is(result.matchType, verificationResult.matchType);
  sinon.assert.calledWithExactly(fakeClient.verifyDeployment, {
    contractAddress: address,
    contractName: 'GreeterV3',
    solidityFilePath: 'contracts/Greeter.sol',
    referenceUri: artifactUri,
    contractNetwork: t.context.fakeChainId,
    artifactPayload: JSON.stringify({
      ...require('../artifacts/contracts/Greeter.sol/GreeterV3.json'),
      immutableReferences: greeterV3ImmutableReferences,
    }),
  });
});

test('verifies deploy with uploaded artifact', async t => {
  const { verifyDeploymentWithUploadedArtifact, fakeClient } = t.context;
  const verificationResult = { matchType: 'EXACT' };
  fakeClient.verifyDeployment.resolves(verificationResult);

  const result = await verifyDeploymentWithUploadedArtifact(address, 'GreeterV3', artifactUri);

  t.is(result.matchType, verificationResult.matchType);
  sinon.assert.calledWithExactly(fakeClient.verifyDeployment, {
    contractAddress: address,
    contractName: 'GreeterV3',
    solidityFilePath: 'contracts/Greeter.sol',
    artifactUri,
    contractNetwork: t.context.fakeChainId,
  });
});

test('returns extended artifact for verification', async t => {
  const { getVerifyDeployArtifact } = t.context;
  const result = await getVerifyDeployArtifact('GreeterV3');

  t.is(
    result.bytecode,
    '0x60a060405234801561001057600080fd5b5060405161010b38038061010b8339818101604052602081101561003357600080fd5b810190808051906020019092919050505080608081815250505060805160a761006460003980604d525060a76000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806354fd4d5014602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b60007f000000000000000000000000000000000000000000000000000000000000000090509056fea2646970667358221220b84390da06820294a9ec14881a611a5c12b610c096d7fd6f384b9c2ac3eff53764736f6c63430006070033',
  );
  t.is(result.deployedBytecode, `0x${greeterV3DeployedBytecode}`);

  // See artifacts/build-info/BUILD.json.output.contracts.'contracts/Greeter.sol'.GreeterV3.evm.deployedBytecode
  t.deepEqual(result.immutableReferences, greeterV3ImmutableReferences);
});

test('returns build info for verification', async t => {
  const { getVerifyDeployBuildInfo } = t.context;
  const result = await getVerifyDeployBuildInfo('GreeterV3');

  t.is(
    result.output.contracts['contracts/Greeter.sol']['GreeterV3'].evm.deployedBytecode.object,
    greeterV3DeployedBytecode,
  );
});

test('returns bytecode digest', async t => {
  const { getBytecodeDigest } = t.context;
  const result = await getBytecodeDigest('GreeterV3');

  t.is(result, greeterV3Digest);
});
