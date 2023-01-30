import { installPackagesTask, logger, Tree, updateJson } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { NxAwsCacheSchematicSchema } from './schema';

function isCompatibleVersion() {
  const json = JSON.parse(readFileSync('package.json').toString());
  let version = json.dependencies['@nrwl/workspace'] || json.devDependencies['@nrwl/workspace'];

  if (!version) {
    throw new Error(`You must use Nx >= 8.0 to enable Storage Cache`);
  }

  if (version.startsWith('^') || version.startsWith('~')) {
    version = version.substr(1);
  }

  const [major, minor] = version.split('.');
  const majorNumber = Number.parseInt(major, 10);

  if (isNaN(majorNumber)) {
    return true;
  }

  // eslint-disable-next-line no-magic-numbers
  if (majorNumber >= 9) {
    return true;
  }

  // eslint-disable-next-line no-magic-numbers
  if (Number.parseInt(minor, 10) >= 12) {
    return true;
  }

  return false;
}

function isYarn() {
  try {
    return statSync('yarn.lock').isFile();
  } catch (err) {
    return false;
  }
}

function updateWorkspacePackage() {
  logger.log(
    `Updating @nrwl/workspace to 8.12.10 to make the workspace compatible with Storage Cache.`,
  );

  if (isYarn()) {
    logger.log(`yarn add --dev @nrwl/workspace@8.12.10`);

    execSync(`yarn add --dev @nrwl/workspace@8.12.10`, {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
  } else {
    logger.log(`npm i --save-dev @nrwl/workspace@8.12.10`);

    execSync(`npm i --save-dev @nrwl/workspace@8.12.10`, {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
  }
}

function updateNxJson(tree: Tree, ops: NxAwsCacheSchematicSchema): void {
  updateJson(tree, 'nx.json', (jsonContent) => {
    jsonContent.tasksRunnerOptions = {
      default: {
        runner: '@nx-aws-plugin/nx-aws-cache',
        options: {
          ...(ops.awsBucket ? { awsBucket: ops.awsBucket } : {}),
          ...(ops.awsRegion ? { awsRegion: ops.awsRegion } : {}),
          cacheableOperations: ['build', 'test', 'lint', 'e2e'],
        },
      },
    };

    return jsonContent;
  });
}

// eslint-disable-next-line func-names
export default function (tree: Tree, options: NxAwsCacheSchematicSchema): () => void {
  if (!isCompatibleVersion()) {
    updateWorkspacePackage();
  }

  updateNxJson(tree, options);

  return () => {
    installPackagesTask(tree);
  };
}
