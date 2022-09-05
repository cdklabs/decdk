import { typescript, vscode } from 'projen';

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
  devDeps: [
    '@types/fs-extra@^8',
    '@types/yaml',
    '@types/yargs',
    'jsii',
    'fast-check',
  ],
  releaseToNpm: true,

  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,

  jestOptions: {
    extraCliOptions: ['--runInBand'],
    jestConfig: {
      setupFilesAfterEnv: ['<rootDir>/test/util.ts'],
    },
  },

  prettier: true,
  prettierOptions: {
    settings: {
      singleQuote: true,
    },
  },

  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['es2020'],
    },
  },

  gitignore: ['cdk.out'],
});

// Build schema after compilation
project.tasks
  .tryFind('post-compile')
  ?.exec('node bin/decdk-schema > cdk.schema.json');

// resolve @types/prettier@2.6.0 conflicts with
// typescript 3.9 (required by current jsii)
project.addFields({
  resolutions: {
    '@types/prettier': '2.6.0',
  },
});

// VSCode
const vsCode = new vscode.VsCode(project);
vsCode.extensions.addRecommendations(
  'dbaeumer.vscode-eslint',
  'esbenp.prettier-vscode',
  'orta.vscode-jest'
);
vsCode.settings.addSettings({
  'editor.defaultFormatter': 'esbenp.prettier-vscode',
  'eslint.format.enable': true,
  'jest.autoRun': 'off',
  'jest.jestCommandLine': './node_modules/.bin/jest',
});
vsCode.settings.addSettings(
  { 'editor.defaultFormatter': 'dbaeumer.vscode-eslint' },
  ['javascript', 'typescript']
);
vsCode.launchConfiguration.addConfiguration({
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
  console: vscode.Console.INTEGRATED_TERMINAL,
  disableOptimisticBPs: true,
  cwd: '${workspaceFolder}',
});

project.synth();
