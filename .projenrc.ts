import { typescript, vscode, YamlFile } from 'projen';

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
    'semver',
  ],
  devDeps: [
    '@types/fs-extra@^8',
    '@types/semver',
    '@types/yaml',
    '@types/yargs',
    'jsii',
    'fast-check',
  ],
  releaseFailureIssue: true,
  releaseToNpm: true,

  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,

  // Disable jest in favor of mocha
  jest: false,

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

  gitignore: ['cdk.out', '/.idea'],
});
project.addPackageIgnore('/cdk.out/');
project.addPackageIgnore('/docs/');
project.addPackageIgnore('/examples/');
project.addPackageIgnore('/*.schema.json');
project.addPackageIgnore('/*.specs.json');

project.tryFindObjectFile('tsconfig.dev.json')?.addOverride('ts-node', {
  transpileOnly: true,
});

// Build schema after compilation
project.tasks
  .tryFind('post-compile')
  ?.exec('node bin/decdk-schema --no-warnings > cdk.schema.json');

// Build deCDK specs after compilation
project.tasks
  .tryFind('post-compile')
  ?.exec('node bin/decdk-specs --no-warnings > decdk.specs.json');

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
  'hbenl.vscode-mocha-test-adapter',
  'redhat.vscode-yaml'
);
vsCode.settings.addSettings({
  'editor.defaultFormatter': 'esbenp.prettier-vscode',
  'eslint.format.enable': true,
});
vsCode.settings.addSettings(
  { 'editor.defaultFormatter': 'dbaeumer.vscode-eslint' },
  ['javascript', 'typescript']
);

// Setup Mocha
project.package.addDevDeps(
  '@types/mocha',
  'expect',
  'mocha',
  'mocha-expect-snapshot',
  'nyc'
);
project.testTask.prependExec(
  'TS_NODE_PROJECT="tsconfig.dev.json" nyc --reporter=html --reporter=text mocha --updateSnapshot'
);

new YamlFile(project, '.mocharc.yaml', {
  obj: {
    ui: 'tdd',
    spec: ['test/**/*.test.ts'],
    require: ['ts-node/register', 'mocha-expect-snapshot', 'test/setup.ts'],
    timeout: 10_000,
    slow: 500,
  },
});
project.addPackageIgnore('.mocharc.yaml');
project.annotateGenerated('*.snap');
project.addPackageIgnore('/coverage/');
project.addPackageIgnore('/.nyc_output/');
vsCode.settings.addSettings({
  'mochaExplorer.env': {
    TS_NODE_PROJECT: 'tsconfig.dev.json',
  },
  'testExplorer.useNativeTesting': true,
});

project.synth();
