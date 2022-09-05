import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { Template as AssertionTemplate } from 'aws-cdk-lib/assertions';
import * as reflect from 'jsii-reflect';
import * as jsonschema from 'jsonschema';
import { DeclarativeStack, loadTypeSystem } from '../src';
import { renderFullSchema } from '../src/cdk-schema';
import { Template } from '../src/parser/template';

let _cachedTS: reflect.TypeSystem;
async function obtainTypeSystem() {
  // Load the typesystem only once, it's quite expensive
  if (!_cachedTS) {
    _cachedTS = await loadTypeSystem(true);
  }
  return _cachedTS;
}

let _cachedSchema: jsonschema.Schema;
async function loadJsonSchema() {
  // Load only once, it's quite expensive
  if (!_cachedSchema) {
    _cachedSchema = renderFullSchema(await obtainTypeSystem());
  }
  return _cachedSchema;
}

let _cachedExamples: fs.Dirent[];
function loadExamples() {
  // Load only once, it's quite expensive
  if (!_cachedExamples) {
    const isTemplateFile = (dirent: fs.Dirent): boolean =>
      dirent.isFile() &&
      (dirent.name.endsWith('.json') || dirent.name.endsWith('.yaml'));

    _cachedExamples = fs
      .readdirSync(Testing.examples_dir, { withFileTypes: true })
      .filter(isTemplateFile);
  }
  return _cachedExamples;
}

export class Testing {
  public static get typeSystem() {
    return obtainTypeSystem();
  }

  public static get schema() {
    return loadJsonSchema();
  }

  public static get examples_dir() {
    return path.join(__dirname, '..', 'examples');
  }

  public static get examples() {
    return loadExamples();
  }

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

export function testExamples(
  testCase: (example: { name: string; path: string }) => any,
  timeout?: number
) {
  test.each(Testing.examples.map((file) => ({ file })))(
    '$file.name',
    ({ file }) =>
      testCase({
        name: file.name,
        path: join(Testing.examples_dir, file.name),
      }),
    timeout
  );
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTemplate: () => CustomMatcherResult;
    }
  }
}

expect.extend({
  async toBeValidTemplate(template) {
    const result = jsonschema.validate(template, await Testing.schema);

    if (!result.valid) {
      return {
        pass: false,
        message: () =>
          'Expected valid template, got:' +
          '\n' +
          result.errors.map((e) => e.message).join('\n'),
      };
    }

    return {
      pass: true,
      message: () => 'Expected template to be invalid, but it was valid.',
    };
  },
});
