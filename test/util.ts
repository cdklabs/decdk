import * as cdk from 'aws-cdk-lib';
import { Template as AssertionTemplate } from 'aws-cdk-lib/assertions';
import * as reflect from 'jsii-reflect';
import { DeclarativeStack, loadTypeSystem } from '../src';
import { Template } from '../src/parser/template';

let _cachedTS: reflect.TypeSystem;
async function obtainTypeSystem() {
  // Load the typesystem only once, it's quite expensive
  if (!_cachedTS) {
    _cachedTS = await loadTypeSystem(true);
  }
  return _cachedTS;
}

export class Testing {
  public static async synth(template: Template) {
    const { app, stack } = await this.prepare(template);

    return app.synth().getStackByName(stack.stackName);
  }

  public static async template(template: Template) {
    const { stack } = await this.prepare(template);

    return AssertionTemplate.fromStack(stack);
  }

  private static async prepare(template: Template) {
    const stackName = 'Test';
    const typeSystem = await obtainTypeSystem();

    const app = new cdk.App();

    const stack = new DeclarativeStack(app, stackName, {
      template,
      typeSystem,
    });

    return { app, stack };
  }

  private constructor() {}
}
