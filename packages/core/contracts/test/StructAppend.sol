// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StructAppendV1 {
    struct MyStruct {
        uint256 x;
        uint256 y;
    }
    
    MyStruct public myStruct;
}

contract StructAppendV2_Ok {
    struct MyStruct {
        uint256 x;
        uint256 y;
        uint256 z;  // appended field
    }
    
    MyStruct public myStruct;
}

contract StructAppendV2_Bad {
    struct MyStruct {
        uint256 x;
        uint256 y;
    }
    
    MyStruct public myStruct;
    uint256 public afterStruct;  // variable after struct
    
    struct MyStruct2 {
        uint256 x;
        uint256 y;
        uint256 z;  // this append should fail
    }
} 