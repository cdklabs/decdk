import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';
import yargs from 'yargs';
import { DeclarativeStack, loadTypeSystem, readTemplate, stackNameFromFileName } from '.';

async function main() {
  const argv = await yargs
    .usage('$0 <filename>', 'Synthesize a CDK stack from a declarative JSON schema')
    .positional('filename', { type: 'string', required: true })
    .argv;


  const templateFile = argv.filename;
  if (!templateFile) {
    throw new Error('filename is missing');
  }

  const template = await readTemplate(templateFile);
  const stackName = stackNameFromFileName(templateFile);
  const typeSystem = await loadTypeSystem();

  const app = new cdk.App();
  new DeclarativeStack(app, stackName, { template, typeSystem });
  app.synth();
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error(chalk.red(e));
  process.exit(1);
});
