import { renderFullSchema } from "./cdk-schema";
import { loadTypeSystem } from "./util";

/* eslint-disable no-console */

async function main() {
  const typeSystem = await loadTypeSystem();
  const schema = await renderFullSchema(typeSystem, {
    colors: true,
    warnings: true,
  });
  console.log(JSON.stringify(schema, undefined, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
