# Dependency Version Checker

This is a CLI to check which version (or versions!) of a package are installed in various repos.

It uses the `yarn.lock` file in the repo as a source of truth.

## Which repos does this check?

- See [repos.ts](./repos.ts)

## Setup

1. Clone the repo.
2. Run `yarn install` to install the dependencies.
3. [Create a Github Personal Access Token](https://github.com/settings/tokens) with `repo` permissions.
4. Create a `.envrc` file, and set

```
export GITHUB_TOKEN="<YOUR PERSONAL ACCESS TOKEN HERE>"
```

5. If you use [direnv](https://direnv.net/) type `direnv allow .` to add this environment variable to your shell.
   Otherwise type `source .envrc`

## Usage

```sh
yarn list-versions <package-name>
yarn list-versions react
yarn list-versions react react-dom
yarn list-versions @kaizen/component-library
yarn list-versions "@kaizen/*"
yarn list-versions "@kaizen/*" "@cultureamp/*"
```
