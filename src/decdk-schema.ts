import yargs from 'yargs';
import { renderFullSchema } from './schema/cdk-schema';
import { loadTypeSystem } from './util';

/* eslint-disable no-console */

async function main() {
  const argv = await yargs
    .usage('$0', 'Generate a JSON Schema to validate deCDK templates')
    .option('warnings', {
      default: true,
      type: 'boolean',
    }).argv;

  const typeSystem = await loadTypeSystem();
  const schema = await renderFullSchema(typeSystem, {
    colors: true,
    warnings: argv.warnings,
    suppressWarnings: [
      // Only an object with methods can satisfy this interface and no built-in class is provided since the feature is intended as an escape hatch
      'aws-cdk-lib.aws_lambda_nodejs.BundlingOptions.commandHooks',
      // Only an object with methods can satisfy this and no built-in class is provided since the feature is intended for user land functionality
      'aws-cdk-lib.BundlingOptions.local',
    ],
  });
  console.log(JSON.stringify(schema, undefined, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
