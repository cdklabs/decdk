import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

const SCHEMA_DIR = path.resolve(__dirname, '../../src/specs');

export function bump() {
  const versionFile = path.join(SCHEMA_DIR, 'specs.version.json');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const metadata = require(versionFile);

  console.log(metadata);

  const oldVersion = metadata.schemaVersion;
  const newVersion = semver.inc(oldVersion, 'major');

  console.log(`Updating schema version: ${oldVersion} -> ${newVersion}`);
  fs.writeFileSync(versionFile, JSON.stringify({ schemaVersion: newVersion }));
}
