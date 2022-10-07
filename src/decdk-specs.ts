import { generateDeCDKSpecs } from './specs/specs-generation';
import { loadTypeSystem } from './util';

/* eslint-disable no-console */

async function main() {
  const typeSystem = await loadTypeSystem();
  const specs = await generateDeCDKSpecs(typeSystem);
  console.log(JSON.stringify(specs, undefined, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
