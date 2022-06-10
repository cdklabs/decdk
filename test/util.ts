import * as os from 'os';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs-extra';
import * as reflect from 'jsii-reflect';
import { DeclarativeStack, loadTypeSystem } from '../src';

let _cachedTS: reflect.TypeSystem;
async function obtainTypeSystem() {
  // Load the typesystem only once, it's quite expensive
  if (!_cachedTS) {
    _cachedTS = await loadTypeSystem(true);
  }
  return _cachedTS;
}

export async function synthesize(template: any) {
  const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'decdk-'));
  const stackName = 'test';
  const typeSystem = await obtainTypeSystem();

  const app = new cdk.App();

  new DeclarativeStack(app, stackName, {
    workingDirectory,
    template,
    typeSystem,
  });

  return app.synth().getStackByName(stackName);
}
