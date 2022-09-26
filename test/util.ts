import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import {
  Match as BaseMatch,
  Template as AssertionTemplate,
} from 'aws-cdk-lib/assertions';
import * as reflect from 'jsii-reflect';
import * as jsonschema from 'jsonschema';
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

let _cachedSchema: jsonschema.Schema;
function loadJsonSchemaFromFile() {
  // Load only once, it's quite expensive
  if (!_cachedSchema) {
    _cachedSchema = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'cdk.schema.json')).toString()
    );
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

  public static get examples_dir() {
    return path.join(__dirname, '..', 'examples');
  }

  public static get examples() {
    return loadExamples();
  }

  public static async synth(template: Template, validateTemplate = true) {
    const { app, stack } = await this.prepare(template, validateTemplate);

    return app.synth().getStackByName(stack.stackName);
  }

  public static async template(template: Template, validateTemplate = true) {
    const { stack } = await this.prepare(template, validateTemplate);

    return AssertionTemplate.fromStack(stack);
  }

  private static async prepare(template: Template, validateTemplate: boolean) {
    if (validateTemplate) {
      expect(template.template).toBeValidTemplate();
    }

    const stackName = 'Test';
    const typeSystem = await obtainTypeSystem();

    const app = new cdk.App({
      analyticsReporting: false,
    });

    const stack = new DeclarativeStack(app, stackName, {
      template,
      typeSystem,
      synthesizer: new DefaultStackSynthesizer({
        generateBootstrapVersionRule: false,
      }),
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

export class Match extends BaseMatch {
  public static logicalIdFor(id: string) {
    return Match.stringLikeRegexp(`^${id}.{8}$`);
  }
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTemplate: () => CustomMatcherResult;
    }
  }
}

expect.extend({
  toBeValidTemplate(template) {
    const schema = loadJsonSchemaFromFile();
    const result = jsonschema.validate(template, schema);

    if (!result.valid) {
      return {
        pass: false,
        message: () =>
          'Expected valid template, got error(s):' +
          '\n' +
          result.errors
            .map((e) => `- ${e.path.join('.')} ${e.message}`)
            .join('\n'),
      };
    }

    return {
      pass: true,
      message: () => 'Expected template to be invalid, but it was valid.',
    };
  },
});

export function matchStringLiteral(value: string) {
  return { type: 'string', value };
}

export function matchConstruct(props: object) {
  return expect.objectContaining({
    type: 'construct',
    props: matchStruct(props),
  });
}

export function matchInitializer(fqn: string, args: object[]) {
  return expect.objectContaining({
    type: 'initializer',
    fqn,
    namespace: ns(fqn),
    args: {
      type: 'array',
      array: expect.arrayContaining(args),
    },
  });
}
const ns = (fqn: string, take = 1) => {
  return (
    fqn
      .split('.')
      .slice(1, take * -1)
      .join('.') || undefined
  );
};

export function matchStaticMethodCall(fqn: string, args: object[]) {
  return expect.objectContaining({
    type: 'staticMethodCall',
    fqn: fqn.split('.').slice(0, -1).join('.'),
    namespace: ns(fqn, 2),
    method: fqn.split('.').slice(-1).pop(),
    args: {
      type: 'array',
      array: expect.arrayContaining(args),
    },
  });
}

export function matchStruct(fields: object) {
  return {
    type: 'struct',
    fields: expect.objectContaining(fields),
  };
}

export function matchFnRef(logicalId: string) {
  return { type: 'intrinsic', fn: 'ref', logicalId };
}

export function matchResolveFnRef(logicalId: string) {
  return {
    type: 'resolve-reference',
    reference: { type: 'intrinsic', fn: 'ref', logicalId },
  };
}

export function matchFnGetAtt(logicalId: string, attribute?: object) {
  return expect.objectContaining({
    type: 'intrinsic',
    fn: 'getAtt',
    logicalId,
    ...(attribute ? { attribute } : {}),
  });
}

export function matchFnSub(fragments: object[], additionalContext: object) {
  return {
    type: 'intrinsic',
    fn: 'sub',
    fragments: expect.arrayContaining(fragments),
    additionalContext: expect.objectContaining(additionalContext),
  };
}

export function matchSubRefFragment(logicalId: string) {
  return { type: 'ref', logicalId };
}
export function matchSubLiteralFragment(content: string) {
  return { type: 'literal', content };
}
