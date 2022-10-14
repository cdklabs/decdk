import * as fs from 'fs';
import * as path from 'path';
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

const isTemplateFile = (dirent: fs.Dirent): boolean =>
  dirent.isFile() &&
  (dirent.name.endsWith('.json') || dirent.name.endsWith('.yaml'));

interface TemplateFixture {
  id: string;
  name: string;
  path: string;
}
let _cachedExamples: Map<string, TemplateFixture[]> = new Map();
const fixtureDirs = [
  path.join(__dirname, '..', 'examples'),
  path.join(__dirname, 'fixtures', 'templates'),
];
export function loadTemplateFixtures(
  directories = fixtureDirs
): TemplateFixture[] {
  // Load only once, it's quite expensive
  const cacheKey = Buffer.from(JSON.stringify(directories), 'utf8').toString(
    'base64'
  );

  if (_cachedExamples.has(cacheKey)) {
    return _cachedExamples.get(cacheKey)!;
  }

  const fixtures = directories.flatMap((fixtureDir) =>
    fs
      .readdirSync(fixtureDir, { withFileTypes: true })
      .filter(isTemplateFile)
      .map((file) => ({
        id: path.join(path.basename(fixtureDir), file.name),
        name: file.name,
        path: path.join(fixtureDir, file.name),
      }))
  );
  _cachedExamples.set(cacheKey, fixtures);
  return fixtures;
}

export class Testing {
  public static get typeSystem() {
    return obtainTypeSystem();
  }

  public static get templateFixtures() {
    return loadTemplateFixtures();
  }

  public static get schema() {
    return loadJsonSchemaFromFile();
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

export interface TemplateFixturesTestOptions {
  timeout?: number;
}

export function testTemplateFixtures(
  testCase: (example: { name: string; path: string }) => any,
  fixtures = Testing.templateFixtures,
  options: TemplateFixturesTestOptions = {}
) {
  test.each(fixtures.map((file) => ({ file })))(
    '$file.id',
    ({ file }) => testCase(file),
    options.timeout
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
          resourceErrors(schema, result.errors)
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

function resourceErrors(
  schema: jsonschema.Schema,
  errors: jsonschema.ValidationError[]
): jsonschema.ValidationError[] {
  return errors.flatMap((e) => {
    const definitions = schema.definitions || {};
    if (
      e.path.length !== 2 ||
      e.path[0] !== 'Resources' ||
      !definitions[e.instance.Type]
    ) {
      return e;
    }
    const local = jsonschema.validate(e.instance, {
      $schema: 'http://json-schema.org/draft-04/schema#',
      definitions,
      $ref: `#/definitions/${e.instance.Type}`,
    });

    return local.errors.map((localError) => {
      localError.path = [...e.path, ...localError.path];
      localError.property = ['instance', ...localError.path].join('.');
      localError.stack = localError.property + ' ' + localError.message;
      return localError;
    });
  });
}

export function matchStringLiteral(value: string) {
  return { type: 'string', value };
}

export function matchConstruct(props: object) {
  return expect.objectContaining({
    type: 'construct',
    props: matchStruct(props),
  });
}

export function matchLazyResource(call: any) {
  return expect.objectContaining({
    type: 'lazyResource',
    call,
  });
}

export function matchInstanceMethodCall(target: string, args: any[] = []) {
  return expect.objectContaining({
    type: 'instanceMethodCall',
    logicalId: target,
    args: {
      type: 'array',
      array: expect.arrayContaining(args),
    },
  });
}
export function matchInitializer(fqn: string, args: object[] = []) {
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
