import yargs from 'yargs';
import { renderFullSchema } from './cdk-schema';
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
  });
  console.log(JSON.stringify(schema, undefined, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
