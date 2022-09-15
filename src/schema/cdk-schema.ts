import chalk from 'chalk';
import { ClassType } from 'jsii-reflect';
import * as jsiiReflect from 'jsii-reflect';
import {
  enumLikeClassMethods,
  enumLikeClassProperties,
  SchemaContext,
  schemaForEnumLikeClass,
  schemaForTypeReference,
} from './jsii2schema';

/* eslint-disable no-console */

export interface RenderSchemaOptions {
  warnings?: boolean;

  /**
   * Use colors when printing ouput.
   * @default true if tty is enabled
   */
  colors?: boolean;
}

function overrideDefinition() {
  return {
    additionalProperties: false,
    type: 'object',
    properties: {
      ChildConstructPath: {
        type: 'string',
        pattern: '[a-zA-Z0-9\\-\\._]+',
      },
      RemoveResource: {
        type: 'boolean',
      },
      Delete: {
        type: 'object',
        properties: {
          Path: {
            type: 'string',
            pattern: '[a-zA-Z0-9\\-\\._]+',
          },
        },
        required: ['Path'],
      },
      Update: {
        type: 'object',
        properties: {
          Path: {
            type: 'string',
            pattern: '[a-zA-Z0-9\\-\\._]+',
          },
          Value: {},
        },
        required: ['Path'],
      },
    },
    required: ['ChildConstructPath'],
    oneOf: [
      {
        required: ['Delete'],
      },
      {
        required: ['Update'],
      },
      {
        required: ['RemoveResource'],
      },
    ],
  };
}

function dependsOnDefinition() {
  return {
    additionalProperties: false,
    type: ['array', 'string'],
    items: {
      type: 'string',
    },
  };
}

export function renderFullSchema(
  typeSystem: jsiiReflect.TypeSystem,
  options: RenderSchemaOptions = {}
) {
  if (!process.stdin.isTTY || options.colors === false) {
    // Disable chalk color highlighting
    process.env.FORCE_COLOR = '0';
  }

  // Find all constructs for which the props interface
  // (transitively) only consists of JSON primitives or interfaces
  // that consist of JSON primitives
  const constructType = typeSystem.findClass('constructs.Construct');
  const constructs = typeSystem.classes.filter((c) => c.extends(constructType));

  const deconstructs = constructs
    .map(unpackConstruct)
    .filter(
      (c) => c && !isCfnResource(c.constructClass)
    ) as ConstructAndProps[];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const output = require('../../cloudformation.schema.json');

  output.definitions = output.definitions || {};

  const ctx = SchemaContext.root(output.definitions);

  for (const deco of deconstructs) {
    addResource(schemaForResource(deco, ctx));
  }

  const enumLikeClasses = typeSystem.classes.filter(
    (c: ClassType) =>
      enumLikeClassProperties(c).length > 0 ||
      enumLikeClassMethods(c).length > 0
  );

  for (const type of enumLikeClasses) {
    addResource(
      ctx.define(type.spec.fqn, () => schemaForEnumLikeClass(type, ctx))
    );
  }

  output.properties.$schema = {
    type: 'string',
  };

  if (options.warnings) {
    printWarnings(ctx);
  }

  function addResource(resource?: { $ref: string }) {
    if (resource) {
      output.properties.Resources.patternProperties[
        '^[a-zA-Z0-9]+$'
      ].anyOf.push(resource);
    }
  }

  return output;
}

function printWarnings(node: SchemaContext, indent = '') {
  if (!node.hasWarningsOrErrors) {
    return;
  }

  console.error(indent + node.name);

  for (const warning of node.warnings) {
    console.error(chalk.yellow(indent + '  ' + warning));
  }

  for (const error of node.errors) {
    console.error(chalk.red(indent + '  ' + error));
  }

  if (!node.root) {
    indent += '  ';
  }

  for (const child of node.children) {
    printWarnings(child, indent);
  }
}

export function schemaForResource(
  construct: ConstructAndProps,
  ctx: SchemaContext
) {
  ctx = ctx.child('resource', construct.constructClass.fqn);

  return ctx.define(construct.constructClass.fqn, () => {
    return {
      additionalProperties: false,
      properties: {
        Properties: schemaForProps(construct.propsTypeRef, ctx),
        Call: {
          type: 'object',
        },
        Type: {
          enum: [construct.constructClass.fqn],
          type: 'string',
        },
        Tags: {
          type: 'array',
          items: ctx.define('Tag', () => {}),
        },
        DependsOn: ctx.define('DependsOn', dependsOnDefinition),
        Overrides: {
          type: 'array',
          items: ctx.define('Override', overrideDefinition),
        },
      },
      required: ['Type'],
    };
  });
}

function schemaForProps(
  propsTypeRef: jsiiReflect.TypeReference | undefined,
  ctx: SchemaContext
) {
  if (!propsTypeRef) {
    return;
  }

  return schemaForTypeReference(propsTypeRef, ctx);
}

function isCfnResource(klass: jsiiReflect.ClassType) {
  const resource = klass.system.findClass('aws-cdk-lib.CfnResource');
  return klass.extends(resource);
}

function unpackConstruct(
  klass: jsiiReflect.ClassType
): ConstructAndProps | undefined {
  if (!klass.initializer || klass.abstract) {
    return undefined;
  }
  if (klass.initializer.parameters.length < 2) {
    return undefined;
  }

  if (klass.initializer.parameters.length == 2) {
    return {
      constructClass: klass,
      propsTypeRef: undefined,
    };
  }

  const propsParam = klass.initializer.parameters[2];
  if (propsParam.type.fqn === undefined) {
    return undefined;
  }

  return {
    constructClass: klass,
    propsTypeRef: klass.initializer.parameters[2].type,
  };
}

export interface ConstructAndProps {
  constructClass: jsiiReflect.ClassType;
  propsTypeRef?: jsiiReflect.TypeReference;
}
