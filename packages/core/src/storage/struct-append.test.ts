import test from 'ava';
import { processFile } from '../solc/compile';
import { extractStorageLayout } from './extract';
import { astDereferencer } from '../ast-dereferencer';
import { StorageLayoutComparator } from './compare';

async function compileAndCompare(baseCode: string, upgradedCode: string) {
  // Compile both contracts
  const baseCompilation = await processFile('BaseContract.sol', baseCode);
  const upgradedCompilation = await processFile('UpgradedContract.sol', upgradedCode);

  // Get the storage layout for both contracts
  const baseDeref = astDereferencer(baseCompilation.data);
  const upgradedDeref = astDereferencer(upgradedCompilation.data);

  const baseLayout = extractStorageLayout(
    baseCompilation.data.contracts['BaseContract.sol'].BaseContract, 
    baseDeref,
  );
  
  const upgradedLayout = extractStorageLayout(
    upgradedCompilation.data.contracts['UpgradedContract.sol'].UpgradedContract, 
    upgradedDeref,
  );

  // Compare layouts
  const comparator = new StorageLayoutComparator();
  const report = comparator.compareLayouts(
    baseLayout.storage, 
    upgradedLayout.storage,
    baseLayout.namespaces,
    upgradedLayout.namespaces
  );
  
  return report;
}

test('struct append at end of storage - passes validation', async t => {
  const baseCode = `
    pragma solidity ^0.8.0;
    contract BaseContract {
      uint256 a;
      
      struct MyStruct {
        uint256 x;
        uint256 y;
      }
      
      MyStruct s;
    }
  `;
  
  const upgradedCode = `
    pragma solidity ^0.8.0;
    contract UpgradedContract {
      uint256 a;
      
      struct MyStruct {
        uint256 x;
        uint256 y;
        uint256 z;
      }
      
      MyStruct s;
    }
  `;
  
  const report = await compileAndCompare(baseCode, upgradedCode);
  t.false(report.hasErrors());
});

test('struct append not at end of storage - fails validation', async t => {
  const baseCode = `
    pragma solidity ^0.8.0;
    contract BaseContract {
      struct MyStruct {
        uint256 x;
        uint256 y;
      }
      
      MyStruct s;
      uint256 afterStruct;
    }
  `;
  
  const upgradedCode = `
    pragma solidity ^0.8.0;
    contract UpgradedContract {
      struct MyStruct {
        uint256 x;
        uint256 y;
        uint256 z;
      }
      
      MyStruct s;
      uint256 afterStruct;
    }
  `;
  
  const report = await compileAndCompare(baseCode, upgradedCode);
  t.true(report.hasErrors());
});

test('struct append with namespaced storage - passes validation', async t => {
  const baseCode = `
    pragma solidity ^0.8.0;
    contract BaseContract {
      struct MyStruct {
        uint256 x;
        uint256 y;
      }
      
      /// @custom:storage-location erc7201:example.main
      struct MyStorage {
        MyStruct s;
      }
    }
  `;
  
  const upgradedCode = `
    pragma solidity ^0.8.0;
    contract UpgradedContract {
      struct MyStruct {
        uint256 x;
        uint256 y;
        uint256 z;
      }
      
      /// @custom:storage-location erc7201:example.main
      struct MyStorage {
        MyStruct s;
      }
    }
  `;
  
  const report = await compileAndCompare(baseCode, upgradedCode);
  t.false(report.hasErrors());
}); 