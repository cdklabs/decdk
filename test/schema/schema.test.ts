import { spawn as spawnAsync, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as reflect from 'jsii-reflect';
import { SchemaContext, schemaForTypeReference } from '../../src/schema';

const fixturedir = path.join(__dirname, 'fixture');

/* eslint-disable no-console */

// building the decdk schema often does not complete in the default 5 second Jest timeout
jest.setTimeout(60_000);

let typesys: reflect.TypeSystem;

beforeAll(async () => {
  typesys = new reflect.TypeSystem();

  // jsii-compile the fixtures module
  await spawn(require.resolve('jsii/bin/jsii'), { cwd: fixturedir });

  // load the resulting file system
  await typesys.loadFile(path.join(fixturedir, '.jsii'));
  await typesys.load(path.dirname(require.resolve('aws-cdk-lib/.jsii')));
});

describe('interface', () => {
  test('with primitives', async () => {
    // GIVEN
    const defs = {};
    const ctx = SchemaContext.root(defs);

    // WHEN
    const ref = schemaForTypeReference(
      typesys.findFqn('fixture.InterfaceWithPrimitives').reference,
      ctx
    );

    // THEN
    expect(ref).toStrictEqual({
      $ref: '#/definitions/fixture.InterfaceWithPrimitives',
    });
    expect(ctx.definitions).toStrictEqual({
      'fixture.InterfaceWithPrimitives': {
        type: 'object',
        title: 'InterfaceWithPrimitives',
        additionalProperties: false,
        properties: {
          arrayOfStrings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of strings.',
          },
          mapOfNumbers: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
          numberProperty: {
            type: 'number',
            description: 'A property of type number.',
          },
          stringProperty: {
            type: 'string',
            description: 'A property of type string.',
          },
          optionalBoolean: {
            type: 'boolean',
            description: 'Optional boolean.',
          },
        },
        required: [
          'arrayOfStrings',
          'mapOfNumbers',
          'numberProperty',
          'stringProperty',
        ],
        comment: 'fixture.InterfaceWithPrimitives',
      },
    });
  });

  test('Behavioral Interface Implementation Factories', async () => {
    // GIVEN
    const defs = {};
    const ctx = SchemaContext.root(defs);

    // WHEN
    const ref = schemaForTypeReference(
      typesys.findFqn('fixture.InterfaceWithBehavioral').reference,
      ctx
    );

    // THEN
    expect(ref).toStrictEqual({
      $ref: '#/definitions/fixture.InterfaceWithBehavioral',
    });
    expect(ctx.definitions).toMatchObject({
      'fixture.IFeature': {
        anyOf: expect.arrayContaining([
          { $ref: '#/definitions/fixture.AnotherFactory' },
          { $ref: '#/definitions/fixture.FeatureFactory' },
        ]),
        comment: 'fixture.IFeature',
      },
      'fixture.FeatureFactory': {
        anyOf: [
          { $ref: '#/definitions/fixture.FeatureFactory.baseFeature' },
          {
            // top-level declaration using a static method call
            additionalProperties: false,
            properties: {
              Call: {
                type: 'object',
              },
              Type: {
                type: 'string',
                enum: ['fixture.FeatureFactory'],
              },
              On: {
                type: 'string',
              },
            },
            type: 'object',
          },
        ],
        comment: 'fixture.FeatureFactory',
      },
    });
  });

  test('static factory methods can provide implementations', async () => {
    // GIVEN
    const defs = {};
    const ctx = SchemaContext.root(defs);

    // WHEN
    const ref = schemaForTypeReference(
      typesys.findFqn('fixture.IFeature').reference,
      ctx
    );

    // THEN
    expect(ref).toStrictEqual({
      $ref: '#/definitions/fixture.IFeature',
    });
    expect(ctx.definitions).toMatchObject({
      'fixture.IFeature': {
        anyOf: expect.arrayContaining([
          { $ref: '#/definitions/fixture.NonImplementingFactory.factoryOne' },
          { $ref: '#/definitions/fixture.NonImplementingFactory.factoryTwo' },
        ]),
        comment: 'fixture.IFeature',
      },
      'fixture.NonImplementingFactory.factoryOne': {
        type: 'object',
        properties: {
          'fixture.NonImplementingFactory.factoryOne': {
            type: ['array', 'null'],
            maxItems: 0,
          },
        },
      },
      'fixture.NonImplementingFactory.factoryTwo': {
        type: 'object',
        additionalProperties: false,
        properties: {
          'fixture.NonImplementingFactory.factoryTwo': {
            anyOf: expect.anything(),
          },
        },
        comment: 'fixture.NonImplementingFactory.factoryTwo',
      },
    });
  });
});

/**
 * Version of spawn() that returns a promise
 *
 * Need spawn() so that we can set stdio to inherit so that any jsii errors
 * are propagated outwards.
 */
function spawn(command: string, options: SpawnOptions | undefined) {
  return new Promise<void>((resolve, reject) => {
    const cp = spawnAsync(command, [], { stdio: 'inherit', ...options });

    cp.on('error', reject);
    cp.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      }
      reject(new Error(`Subprocess exited with ${code || signal}`));
    });
  });
}
