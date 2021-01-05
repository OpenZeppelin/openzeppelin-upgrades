// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract ManifestMigrateLayout {
    struct T {
        bool b;
    }

    struct S {
        uint x;
        string s;
        T t;
    }

    enum E {
        E1,
        E2
    }

    uint x1;
    T t1;
    S s1;
    string s2;
    bool b1;
    E e1;
}

contract ManifestMigrateUnique is ManifestMigrateLayout {
    function useAll() external {
        x1 = 5;
        t1 = T({ b: true });
        s1 = S({ x: 6, s: "ok", t: t1 });
        s2 = "no";
        b1 = false;
        e1 = E.E2;
    }
}

contract ManifestMigrateUnambiguous0 is ManifestMigrateLayout {
    function useAll() external {
        x1 = 10;
        t1 = T({ b: false });
        s1 = S({ x: 6, s: "string", t: t1 });
        s2 = "ok";
        b1 = false;
        e1 = E.E1;
    }
}

// These two are expected to have the same bytecode modulo metadata.
contract ManifestMigrateUnambiguous1 is ManifestMigrateUnambiguous0 { }
contract ManifestMigrateUnambiguous2 is ManifestMigrateUnambiguous0 { }

contract ManifestMigrateAmbiguous0 is ManifestMigrateLayout {
    function useAll() external {
        x1 = 15;
        t1 = T({ b: false });
        s1 = S({ x: 7, s: "s", t: t1 });
        s2 = "s2";
        b1 = false;
        e1 = E.E2;
    }
}

// These two are expected to have the same bytecode modulo metadata, but different layout.
contract ManifestMigrateAmbiguous1 is ManifestMigrateAmbiguous0 {
    uint z1;
}
contract ManifestMigrateAmbiguous2 is ManifestMigrateAmbiguous0 {
    bool z2;
}
