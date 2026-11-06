---
'@openzeppelin/upgrades-core': minor
---

Report an error when the underlying type of a user-defined value type changes, including when its size stays the same, such as from `uint128` to `int128`. If the change is intended, annotate the variable or struct member with `@custom:oz-retyped-from <previous underlying type>`.
