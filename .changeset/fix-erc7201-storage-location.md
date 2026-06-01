---
'@openzeppelin/upgrades-core': patch
---

Fix ERC-7201 storage location calculation for namespace ids whose intermediate hash has an odd-length or short hex representation, which previously produced an incorrect location for roughly 6% of ids.
