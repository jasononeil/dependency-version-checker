import { Octokit } from "@octokit/rest";
import { parse, LockFileObject } from "@yarnpkg/lockfile";
import { repos } from "./repos";
import { writeFile } from "fs";
const meow = require('meow');

const logging = verbose => message => {
  if (verbose) { 
    console.log(message)
  }
}

async function main() {
  const cli = bootstrapCli();
  if (cli.input.length === 0) {
    cli.showHelp()
    process.exit(1);
  }
  const packagesToCheck = cli.input;
  const outputLocation = cli.flags.output;
  const log = logging(cli.flags.verbose);
  const githubApi = setupGithubApi();

  let versions = {};
  
  for (const packageNameParam of packagesToCheck) {
    log(`Searching for package ${packageNameParam}`);
    for (const repo of repos) {
      log(`  In repo ${repo.repo}`);
      versions[repo.repo] = {} // add repo to output
      const [org, repository] = repo.repo.split("/");
      const lockFile = await getLockfile(
        githubApi,
        org,
        repository,
        repo.lockFile
      );
      const packageVersions = findVersions(lockFile, packageNameParam);
      for (const packageName of Object.keys(packageVersions)) {
        if (packageVersions[packageName].length > 0) {
          versions[repo.repo][packageName] = packageVersions[packageName] // add repo to output
          log(
            `    Package ${packageName}: ${packageVersions[packageName].join(
              ", "
            )}`
          );
        }
      }
    }
  }

  if (outputLocation) {
    writeFile(outputLocation, JSON.stringify(versions), (err) => {
      if (err) throw err;
      log(`Ouput written to ${outputLocation}`)
    });
  }
}

function bootstrapCli() {
  return meow(`
    Usage
      yarn list-versions <package-name>

    Options
      --version list this packages version
      --verbose log parsing information to CLI
      --output="log.json" location to output the data 
    
    Examples 
      yarn list-versions react
      yarn list-versions react react-dom
      yarn list-versions @kaizen/component-library
      yarn list-versions "@kaizen/*"
      yarn list-versions "@kaizen/*" "@cultureamp/*"
  `, {

  })
}

function setupGithubApi(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw `Please set process.env.GITHUB_TOKEN with a personal API token`;
  }
  return new Octokit({
    auth: token,
  });
}

async function getLockfile(
  githubApi: Octokit,
  org: string,
  repo: string,
  lockFilePath: string
): Promise<LockFileObject> {
  const result = await githubApi.repos.getContent({
    owner: org,
    repo: repo,
    path: lockFilePath,
  });
  if (result.status != 200) {
    throw `Bad request, status code ${result.status}`;
  }
  const lockFileContent = Buffer.from(result.data.content, "base64").toString();
  const lockFileParse = parse(lockFileContent);
  if (lockFileParse.type !== "success") {
    throw `Failed to parse lockfile, result ${lockFileParse.type}`;
  }
  return lockFileParse.object;
}

function findVersions(
  lockFile: LockFileObject,
  packageNameParam: string
): { [name: string]: string[] } {
  const packageVersions = {};
  for (const key of Object.keys(lockFile)) {
    const packageName = key.substr(0, key.lastIndexOf("@"));
    if (packageVersions[packageName] === undefined) {
      packageVersions[packageName] = [];
    }
    if (lockFileKeyMatches(key, packageNameParam)) {
      const version = lockFile[key].version;
      if (!packageVersions[packageName].includes(version)) {
        packageVersions[packageName].push(version);
      }
    }
  }
  return packageVersions;
}

function lockFileKeyMatches(key: string, packageNameParam: string) {
  if (packageNameParam.endsWith("*")) {
    const nameWithoutAsterisk = packageNameParam.substr(
      0,
      packageNameParam.length - 1
    );
    return key.startsWith(nameWithoutAsterisk);
  }
  return key.startsWith(packageNameParam + "@");
}

main();
