import { typescript } from 'projen';

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

project.synth();
