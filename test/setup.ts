declare module 'mocha-expect-snapshot' {
  export function setSnapshotStateOptions(snapshotStateOptions: any): void;
}

import { setSnapshotStateOptions } from 'mocha-expect-snapshot';

setSnapshotStateOptions({
  snapshotFormat: {
    printBasicPrototype: true,
  },
});
