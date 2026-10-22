---
'@openzeppelin/upgrades-core': minor
---

Support `@custom:oz-renamed-from` and `@custom:oz-retyped-from` annotations on struct members, including members of ERC-7201 namespaced structs.
- Fix parsing of multiple annotations in a `/** */` comment block without `*` line prefixes.
- Fix "Layout could have changed" errors for variables whose type didn't change but that keep a `@custom:oz-retyped-from` annotation from an earlier upgrade.
- Clarify the error for a `@custom:oz-renamed-from` annotation on a variable or struct member that was not renamed.
