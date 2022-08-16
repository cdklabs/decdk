import { JsonFile, typescript, vscode } from 'projen';

const project = new typescript.TypeScriptProject({
  projenrcTs: true,
  defaultReleaseBranch: 'main',
  name: 'decdk',
  description:
    'Declarative CDK: a CloudFormation-like syntax for defining CDK stacks',
  authorName: 'Amazon Web Services',
  authorUrl: 'https://aws.amazon.com',
  authorOrganization: true,
  prerelease: 'pre',
  deps: [
    'aws-cdk-lib',
    'constructs@^10',
    'fs-extra@^8',
    'jsii-reflect',
    'jsonschema',
    'yaml',
    'yargs',
    'chalk@^4',
  ],
  devDeps: ['@types/fs-extra@^8', '@types/yaml', '@types/yargs', 'jsii'],
  releaseToNpm: true,

  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,

  prettier: true,
  prettierOptions: {
    settings: {
      singleQuote: true,
    },
  },

  gitignore: ['cdk.schema.json', 'cdk.out'],
});

// resolve @types/prettier@2.6.0 conflicts with
// typescript 3.9 (required by current jsii)
project.addFields({
  resolutions: {
    '@types/prettier': '2.6.0',
  },
});

// VSCode
new JsonFile(project, '.vscode/extensions.json', {
  readonly: false,
  marker: false,
  obj: {
    recommendations: [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'orta.vscode-jest',
    ],
  },
});

new JsonFile(project, '.vscode/settings.json', {
  readonly: false,
  marker: false,
  obj: {
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'eslint.format.enable': true,
    '[javascript]': {
      'editor.defaultFormatter': 'dbaeumer.vscode-eslint',
    },
    '[typescript]': {
      'editor.defaultFormatter': 'dbaeumer.vscode-eslint',
    },
    'jest.autoRun': 'off',
    'jest.jestCommandLine': './node_modules/.bin/jest',
  },
});

new vscode.VsCode(project).launchConfiguration.addConfiguration({
  type: 'node',
  name: 'vscode-jest-tests.v2',
  request: 'launch',
  internalConsoleOptions: vscode.InternalConsoleOptions.NEVER_OPEN,
  program: '${workspaceFolder}/node_modules/.bin/jest',
  args: [
    '--runInBand',
    '--watchAll=false',
    '--testNamePattern',
    '${jest.testNamePattern}',
    '--runTestsByPath',
    '${jest.testFile}',
  ],
});
// The following options are currently not supported by projen
const launchConfig = project.tryFindObjectFile('.vscode/launch.json');
launchConfig?.addOverride('configurations.0.console', 'integratedTerminal');
launchConfig?.addOverride('configurations.0.disableOptimisticBPs', true);
launchConfig?.addOverride('configurations.0.cwd', '${workspaceFolder}');

project.synth();
