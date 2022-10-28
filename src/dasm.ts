import * as cdk from 'aws-cdk-lib';
import chalk from 'chalk';
import yargs from 'yargs';
import { AnnotationsContext, DeclarativeStackError } from './error-handling';
import { CodeEvaluationContext, CodeEvaluator } from './evaluate/code';
import { TypedTemplate } from './type-resolution';
import { loadTypeSystem, readTemplate, stackNameFromFileName } from './util';

let verbosity = 0;

async function main() {
  const argv = await yargs
    .usage(
      '$0 <filename>',
      'Disassemble a CDK app from a declarative JSON or YAML template'
    )
    .option('out', {
      alias: 'o',
      type: 'string',
      demandOption: true,
      describe: 'The directory path to output the disassemble CDK app.',
    })
    .option('verbose', {
      alias: 'v',
      type: 'count',
      description: 'Show debug output. Repeat to increase verbosity.',
    })
    .positional('filename', { type: 'string', required: true }).argv;

  verbosity = argv.verbose;

  const templateFile = argv.filename;
  if (!templateFile) {
    throw new Error('filename is missing');
  }
  const outPath = argv.out;

  const parsedTemplate = await readTemplate(templateFile);
  const stackName = stackNameFromFileName(templateFile);
  const typeSystem = await loadTypeSystem();

  const annotations = AnnotationsContext.root();
  const template = new TypedTemplate(parsedTemplate, {
    annotations,
    typeSystem,
  });

  const context = new CodeEvaluationContext({
    stack: new cdk.Stack(undefined, stackName),
    template,
    typeSystem,
    outPath,
    stackName,
  });
  const ev = new CodeEvaluator(context);

  const project = ev.evaluateTemplate(annotations);

  if (annotations.hasErrors()) {
    throw new DeclarativeStackError(annotations);
  }

  project.saveSync();
}

main().catch((e) => {
  if (e instanceof DeclarativeStackError) {
    e = e.toString(verbosity >= 1);
  }
  // eslint-disable-next-line no-console
  console.error(chalk.red(e));
  process.exit(1);
});
