Contributing to OpenZeppelin Upgrades
=======

Contributions to OpenZeppelin Upgrades are welcome. Please review the information below to test out and contribute your changes.

## Building and testing the project

### Prerequisites
The following prerequisites are required to build the project locally:
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/getting-started/install)

After the prerequisites are installed, the commands below can be run from this project's root directory.

### Installing dependencies
```yarn install```

The dependencies must be installed at least once before running the tests or linter.

### Running tests
```yarn test```

Ensure that all tests pass.  If you are adding new functionality, include testcases as appropriate.

### Running linter
```yarn lint```

If linting errors or warnings occur, run `yarn lint --fix` to attempt to auto-fix issues.  If there are remaining issues that cannot be auto-fixed, manually address them and re-run the command to ensure it passes.

## Creating Pull Requests (PRs)

As a contributor, we ask that you fork this repository, work on your own fork and then submit pull requests. The pull requests will be reviewed and eventually merged into the main repo. See ["Fork-a-Repo"](https://help.github.com/articles/fork-a-repo/) for how this works.

### Adding Changesets
If your PR modifies code under `packages`, you will need to add a changeset to summarize the changes. The PR's `Changeset` GitHub check will give an error if this condition is not satisfied.
- To add a changeset: from the root directory, run `yarn changeset`