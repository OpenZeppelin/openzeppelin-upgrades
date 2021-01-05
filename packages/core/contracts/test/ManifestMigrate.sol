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

// These two are expected to have the same bytecode modulo metadata and similar
// layout, but different types (see struct D members);
contract ManifestMigrateAmbiguous1 is ManifestMigrateUnique {
    struct D {
        uint w;
    }
    D d1;
    function test() external {
        d1.w += 1;
    }
}
contract ManifestMigrateAmbiguous2 is ManifestMigrateUnique {
    struct D {
        uint z;
    }
    D d1;
    function test() external {
        d1.z += 1;
    }
}
