const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { AdminClient } = require('defender-admin-client');

const address = '0x0dB58eF1B0F7Bb3d70177bcBFd31BC557fbE8b2A';
const artifactUri = 'http://example.com/artifact.json';

const greeterV3DeployedBytecode =
  '6080604052348015600f57600080fd5b506004361060285760003560e01c806354fd4d5014602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b60007f000000000000000000000000000000000000000000000000000000000000000090509056fea26469706673582212202e155eb819bdaebf2005f5c86bf88d3c4c29c074fd34fbb97c119cdcb141535364736f6c63430007060033';
const greeterV3Digest = '6f816ef16e21072de628b0a57d6694b9981b0043570119a68f1c5de91b9c110d';
const greeterV3ImmutableReferences = { 40: [{ length: 32, start: 77 }] };

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';

  const verifyDeploymentModule = proxyquire('../dist/platform/verify-deployment', {
    './utils': {
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeClient,
    },
  });

  t.context.verifyDeployment = verifyDeploymentModule.makeVerifyDeploy(hre, true);
  t.context.verifyDeploymentWithUploadedArtifact = verifyDeploymentModule.makeVerifyDeployWithUploadedArtifact(
    hre,
    true,
  );
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

  const result = await verifyDeployment(address, 'GreeterPlatformV3', artifactUri);

  t.is(result.matchType, verificationResult.matchType);
  sinon.assert.calledWithExactly(fakeClient.verifyDeployment, {
    contractAddress: address,
    contractName: 'GreeterPlatformV3',
    solidityFilePath: 'contracts/GreeterPlatform.sol',
    referenceUri: artifactUri,
    contractNetwork: t.context.fakeChainId,
    artifactPayload: JSON.stringify({
      ...require('../artifacts/contracts/GreeterPlatform.sol/GreeterPlatformV3.json'),
      immutableReferences: greeterV3ImmutableReferences,
    }),
  });
});

test('verifies deploy with uploaded artifact', async t => {
  const { verifyDeploymentWithUploadedArtifact, fakeClient } = t.context;
  const verificationResult = { matchType: 'EXACT' };
  fakeClient.verifyDeployment.resolves(verificationResult);

  const result = await verifyDeploymentWithUploadedArtifact(address, 'GreeterPlatformV3', artifactUri);

  t.is(result.matchType, verificationResult.matchType);
  sinon.assert.calledWithExactly(fakeClient.verifyDeployment, {
    contractAddress: address,
    contractName: 'GreeterPlatformV3',
    solidityFilePath: 'contracts/GreeterPlatform.sol',
    artifactUri,
    contractNetwork: t.context.fakeChainId,
  });
});

test('returns extended artifact for verification', async t => {
  const { getVerifyDeployArtifact } = t.context;
  const result = await getVerifyDeployArtifact('GreeterPlatformV3');

  t.is(
    result.bytecode,
    '0x60a060405234801561001057600080fd5b5060405161010b38038061010b8339818101604052602081101561003357600080fd5b810190808051906020019092919050505080608081815250505060805160a761006460003980604d525060a76000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806354fd4d5014602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b60007f000000000000000000000000000000000000000000000000000000000000000090509056fea26469706673582212202e155eb819bdaebf2005f5c86bf88d3c4c29c074fd34fbb97c119cdcb141535364736f6c63430007060033',
  );
  t.is(result.deployedBytecode, `0x${greeterV3DeployedBytecode}`);

  // See artifacts/build-info/BUILD.json.output.contracts.'contracts/GreeterPlatform.sol'.GreeterPlatformV3.evm.deployedBytecode
  t.deepEqual(result.immutableReferences, greeterV3ImmutableReferences);
});

test('returns build info for verification', async t => {
  const { getVerifyDeployBuildInfo } = t.context;
  const result = await getVerifyDeployBuildInfo('GreeterPlatformV3');

  t.is(
    result.output.contracts['contracts/GreeterPlatform.sol']['GreeterPlatformV3'].evm.deployedBytecode.object,
    greeterV3DeployedBytecode,
  );
});

test('returns bytecode digest', async t => {
  const { getBytecodeDigest } = t.context;
  const result = await getBytecodeDigest('GreeterPlatformV3');

  t.is(result, greeterV3Digest);
});
