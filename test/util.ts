import * as os from 'os';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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

export class Testing {
  public static async synth(template: any) {
    const { app, stack } = await this.prepare(template);

    return app.synth().getStackByName(stack.stackName);
  }

  public static async template(template: any) {
    const { stack } = await this.prepare(template);

    return Template.fromStack(stack);
  }

  private static async prepare(template: any) {
    const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'decdk-'));
    const stackName = 'Test';
    const typeSystem = await obtainTypeSystem();

    const app = new cdk.App();

    const stack = new DeclarativeStack(app, stackName, {
      workingDirectory,
      template,
      typeSystem,
    });

    return { app, stack };
  }

  private constructor() {}
}
