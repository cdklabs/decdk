declare module 'mocha-expect-snapshot' {
  export function setSnapshotStateOptions(snapshotStateOptions: any): void;
}

import { setSnapshotStateOptions } from 'mocha-expect-snapshot';
import { Testing } from './util';

setSnapshotStateOptions({
  snapshotFormat: {
    printBasicPrototype: true,
  },
});

export async function mochaGlobalSetup() {
  await Promise.all([
    Testing.typeSystem,
    Testing.schema,
    Testing.templateFixtures,
  ]);
}
