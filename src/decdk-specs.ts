import fs from 'fs';
import path from 'path';
import * as jsonschema from 'jsonschema';
import { generateDeCDKSpecs } from './specs/specs-generation';
import { loadTypeSystem } from './util';

/* eslint-disable no-console */

async function main() {
  const typeSystem = await loadTypeSystem();
  const specs = generateDeCDKSpecs(typeSystem);
  const schema = loadSchema();
  console.log(JSON.stringify(specs, undefined, 2));

  const result = jsonschema.validate(specs, schema);
  if (!result.valid) {
    throw new Error(
      "The specification does not match the schema. Update the JSON schema and run 'src/scripts/bump-schema-version.sh'."
    );
  }
}

function loadSchema() {
  return JSON.parse(
    fs
      .readFileSync(path.join(__dirname, '../src/specs', 'specs.schema.json'))
      .toString()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
