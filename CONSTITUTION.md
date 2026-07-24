# OpenZeppelin Upgrades Constitution

## Core Principles

### I. Fail-Closed Upgrade-Safety Validation (NON-NEGOTIABLE)

Every `deploy*`, `upgrade*`, `validateImplementation`, `validateUpgrade`, and `forceImport`
operation, through any client binding or plugin entry point, MUST run the full set of
upgrade-safety validations before any deployment or manifest write occurs. Validation may be
bypassed only through an explicit, existing, user-facing opt-out (`unsafeAllow*`,
`unsafeSkipStorageCheck`, `unsafeAllowRenames`, NatSpec annotations, and their documented peers).

If validation data is missing, incomplete, outdated, or cannot be matched to the contract being
operated on — a missing or malformed build-info companion file, an absent `storageLayout` output,
a partial compilation, an artifact not present in the validated compilation, a name or encoding
mismatch — the operation MUST fail closed and loudly. Continuing as if validation succeeded is
never acceptable behavior, regardless of how unlikely the failure path appears.

No change may make a validation default more permissive than the currently released behavior.

**Rationale:** Users rely on these plugins as the safety net between them and an irreversible,
funds-bearing on-chain mistake. A silent skip is strictly worse than a hard failure.

### II. Single Validation Chokepoint

Validation is invoked in exactly one place: the client-neutral engine. Client bindings (ethers,
viem, future clients) are dumb encode/deploy/send primitives that MUST only be reachable
downstream of validation — e.g. from inside `fetchOrDeployGetDeployment`. A public API method
MUST NOT call a deploy or send primitive directly.

The wiring that generates validation data MUST be unconditional: compile hooks and task
overrides are registered independently of optional peer dependencies, so a project that omits an
optional client still generates and refreshes validations identically. A missing or outdated
validations cache MUST force recompilation and regeneration, never a stale read.

**Rationale:** A single chokepoint makes "did validation run?" a structural property that can be
verified by reading the call graph, instead of a behavioral property that every new API entry
must independently re-prove.

### III. Deployment & Manifest Integrity

Deployments MUST be idempotent and resumable through the network manifest: an already-deployed
implementation of the same version is reused, and a deployment interrupted before confirmation
is resumed on re-run rather than duplicated. Implementations are recorded (address + txHash)
inside the manifest file lock before mining and confirmed outside the lock.

A reverted or unconfirmed deployment MUST never persist in the manifest as successful. Return
values MUST bind to the correct contract: `deployProxy` returns the proxy (never the
implementation), `upgrade*` preserves the original proxy/beacon address, and every wrapper
attaches the right ABI at the right address.

All manifest mutation goes through core's sanctioned paths (`fetchOrDeploy*`,
`manifest.addProxy`, and core's narrow deletion gates). Bindings and engine orchestration MUST
NOT write, overwrite, or delete manifest state directly. On a real (non-development) network, an
invalid or unresumable stored deployment MUST throw rather than be deleted, reinterpreted, or
silently redeployed.

**Rationale:** The manifest is the source of truth for what is live on-chain; corrupting it, or
trusting an unconfirmed deploy, breaks every future upgrade decision made from it.

### IV. Parity Against Released Behavior

The currently released behavior on `master` is the ground truth. A refactor MUST preserve it
exactly for the same operation and options; a new client binding, framework version, or API
surface MUST match the existing one exactly for the same operation and options. Divergence is
acceptable only when it is an intentional, documented, changeset-recorded behavior change.

Cross-cutting flows are a first-class parity surface: deploy with one binding then upgrade with
another, force-import then upgrade, and migrations between framework versions (e.g. manifest
entries written under Hardhat 2 consumed under Hardhat 3) MUST be exercised, not assumed. When a
migration cannot match existing state with certainty, it MUST preserve the existing state
unchanged rather than guess.

**Rationale:** Released behavior is what deployed systems and third-party tooling depend on;
parity turns "is the refactor safe?" into a checkable comparison instead of a judgment call.

### V. Invariant-First Review & Testing Discipline

Every substantial design, PR, and review MUST be framed around explicit invariants stated as
release criteria, following the established structure: state the invariant, scope what the diff
does and does not change, enumerate concrete failure modes per safety surface, list assumptions
to sanity-check, and identify the high-value code paths.

Safety-relevant behavior MUST be covered by tests that exercise the failure modes, not only the
happy path: validation refusals, fail-closed error paths, manifest resume/idempotency, and
cross-binding flows. New functionality lands with test cases; all tests and lint MUST pass
before merge.

**Rationale:** The two release-gating reviews that shaped this project (Hardhat 3 support, the
engine/viem split) succeeded because failure modes were enumerated up front; encoding that
method makes it survivable across contributors.

## Security & Compatibility Constraints

- **Fail loudly, fail specifically.** Error paths MUST propagate with actionable messages;
  catching an error to continue with degraded safety is prohibited. Configurable severities
  (e.g. `namespacedCompileErrors`) default to the strictest setting.
- **Compiler output is the authority.** Storage-layout compatibility decisions derive from solc
  layout fields (labels, types, slots, namespaces), never from framework-specific artifact
  paths. Path/source-name remapping may affect lookup and reporting, but MUST NOT alter the
  compatibility algorithm; a remapping bug surfaces as a lookup failure, never a silent pass.
- **Deployment identity is canonical.** Version hashes derive from unlinked bytecode plus
  canonically encoded constructor arguments; encoders MUST fail loudly on argument mismatches
  and produce identical results across bindings.
- **Read-only paths cannot deploy.** Validation-only entry points run on bindings that are
  structurally incapable of sending transactions.
- **Toolchain constraints.** Yarn workspaces monorepo; TypeScript throughout; changes affecting
  packaged code require a changeset (dev-only changes instead carry the `ignore-changeset`
  label); ava is intentionally held back (currently `ava@^6` with `@ava/typescript@^7`)
  because ESM-only ava majors force a repo-wide TypeScript bump.

## Development Workflow & Quality Gates

- Work happens on forks/branches and lands via reviewed pull requests into `master`.
- `yarn test` and `yarn lint` MUST pass; CI checks (including coverage and the Changeset check)
  gate merges.
- Release-gating PRs (new framework major versions, new client bindings, engine refactors)
  additionally require a written invariant review per Principle V before acceptance.
- Public API changes MUST keep documentation in sync: package READMEs in the same PR, and the
  docs site sources in their separate repository. The Antora sources under `docs/` in this
  repository are deprecated and MUST NOT be extended.
- Code comments explain invariants and constraints self-containedly; they do not reference PRs,
  tickets, or review threads.

## Governance

This constitution supersedes ad-hoc practice for the surfaces it covers. Compliance with
Principles I–IV is a mandatory review criterion for any PR touching validation, deployment
orchestration, bindings, or manifest handling; reviewers MUST verify the relevant failure modes
fail closed, and deviations MUST be called out and justified in the PR rather than merged
silently.

Amendments are made by pull request that edits this file, states the motivation, and updates
dependent templates in the same change. Versioning follows semantic versioning: MAJOR for
removing or redefining a principle in a backward-incompatible way, MINOR for adding a principle
or materially expanding guidance, PATCH for clarifications and wording. Every amendment updates
the version line and Last Amended date below.

**Version**: 1.0.0 | **Ratified**: 2026-07-23 | **Last Amended**: 2026-07-23
