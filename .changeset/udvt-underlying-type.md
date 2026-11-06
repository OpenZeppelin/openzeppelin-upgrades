---
'@openzeppelin/upgrades-core': minor
---

Report an error when the underlying type of a user-defined value type changes, including when its size stays the same, such as from `uint128` to `int128`. If the change is intended and safe for the stored values, it can be allowed by annotating the variable or struct member with its previous type, written with the previous underlying type in place of the user-defined value type. For example, `@custom:oz-retyped-from uint128` or `@custom:oz-retyped-from mapping(address => uint128)`.
