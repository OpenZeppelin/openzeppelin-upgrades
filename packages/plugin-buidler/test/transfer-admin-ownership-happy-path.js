const bre = require('@nomiclabs/buidler');
const { getManifestAdmin } = require('@openzeppelin/buidler-upgrades/dist/admin.js');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

async function main() {
  const admin = await getManifestAdmin(bre);

  await bre.upgrades.admin.transferProxyAdminOwnership(testAddress);

  const newOwner = await admin.owner();

  if (newOwner !== testAddress) {
    throw new Error('admin.transferProxyAdminOwnership did not change the proxy admin owner');
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
